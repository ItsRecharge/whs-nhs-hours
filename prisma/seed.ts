import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function utcMidnight(daysFromToday: number): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysFromToday),
  );
}

/** The four chapter houses; names are editable later in chapter settings. */
async function seedHouses() {
  const count = await db.house.count();
  if (count > 0) return;
  await db.house.createMany({
    data: ["Gryffindor", "Hufflepuff", "Ravenclaw", "Slytherin"].map(
      (name, i) => ({ name, sortOrder: i + 1 }),
    ),
  });
  console.log("Seeded 4 houses");
}

async function main() {
  await seedHouses();

  const email = process.env.BOOTSTRAP_OFFICER_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_OFFICER_PASSWORD;
  const name = process.env.BOOTSTRAP_OFFICER_NAME?.trim() || "Chapter Officer";

  if (!email || !password) {
    console.log(
      "Skipping bootstrap officer: set BOOTSTRAP_OFFICER_EMAIL and BOOTSTRAP_OFFICER_PASSWORD in .env",
    );
  } else {
    const [firstName, ...rest] = name.split(/\s+/);
    const officer = await db.user.upsert({
      where: { email },
      update: {},
      create: {
        firstName,
        lastName: rest.join(" "),
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "officer",
        isBootstrapOfficer: true,
        emailVerifiedAt: new Date(), // bootstrap account skips verification
      },
    });
    console.log(`Bootstrap officer ready: ${officer.email} (id=${officer.id})`);

    if (process.env.SEED_DEMO === "true") {
      await seedDemo(officer.id);
    }
  }
}

/** Demo data mirroring the original Flask seed (local dev only). */
async function seedDemo(officerId: number) {
  const existing = await db.user.findUnique({ where: { email: "member1@demo.local" } });
  if (existing) {
    console.log("Demo data already seeded, skipping.");
    return;
  }

  const house = await db.house.findFirst({ orderBy: { sortOrder: "asc" } });
  const gradYear = new Date().getUTCFullYear() + 1;
  const member = await db.user.create({
    data: {
      firstName: "Member",
      lastName: "1",
      email: "member1@demo.local",
      passwordHash: await bcrypt.hash("MemberDemo1!", 12),
      role: "member",
      graduationYear: gradYear,
      houseId: house?.id ?? null,
      emailVerifiedAt: new Date(),
    },
  });

  // Completed event with a single attended slot (credits 3 hours).
  const foodDrive = await db.event.create({
    data: {
      title: "Winter Food Drive",
      description: "Sorting and packing donations at the community food pantry.",
      location: "Community Center",
      status: "completed",
      category: "soup_kitchen",
      createdById: officerId,
      approvedById: officerId,
      timeslots: {
        create: {
          date: utcMidnight(-60),
          startTime: "09:00",
          endTime: "12:00",
          hoursValue: 3.0,
          quota: 10,
          completedAt: new Date(),
        },
      },
    },
    include: { timeslots: true },
  });
  await db.eventSignup.create({
    data: {
      timeslotId: foodDrive.timeslots[0].id,
      userId: member.id,
      status: "confirmed",
      attended: true,
      markedById: officerId,
    },
  });

  // Active event with two timeslots; member is confirmed on the morning slot.
  const concert = await db.event.create({
    data: {
      title: "School Garden Workday",
      description: "Planting and weeding in the school courtyard garden.",
      location: "School Courtyard",
      status: "active",
      category: "gardening",
      createdById: officerId,
      approvedById: officerId,
      timeslots: {
        create: [
          {
            date: utcMidnight(21),
            startTime: "09:00",
            endTime: "11:00",
            hoursValue: 2.0,
            quota: 4,
          },
          {
            date: utcMidnight(21),
            startTime: "17:00",
            endTime: "19:00",
            hoursValue: 2.0,
            quota: 4,
          },
        ],
      },
    },
    include: { timeslots: true },
  });
  await db.eventSignup.create({
    data: {
      timeslotId: concert.timeslots[0].id,
      userId: member.id,
      status: "confirmed",
    },
  });

  // Pending member-requested event (single slot).
  await db.event.create({
    data: {
      title: "Library Reading Program",
      description: "Reading with elementary school students at the town library.",
      location: "Town Library",
      status: "pending_approval",
      category: "tutoring",
      createdById: member.id,
      timeslots: {
        create: {
          date: utcMidnight(30),
          startTime: "15:00",
          endTime: "16:30",
          hoursValue: 1.5,
          quota: 6,
        },
      },
    },
  });

  // A pending outside hour report awaiting officer review.
  await db.hourReport.create({
    data: {
      userId: member.id,
      description: "Volunteered at the town soup kitchen",
      date: utcMidnight(-10),
      hoursRequested: 2.0,
      category: "soup_kitchen",
      origin: "outside",
      status: "pending",
    },
  });

  console.log(
    `Demo data seeded: member1@demo.local / MemberDemo1! + 3 events + 1 hour report`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
