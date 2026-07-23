export const metadata = { title: "Link unavailable" };

export default function ShareExpiredPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-gray-900">This link is no longer valid</h1>
      <p className="mt-2 text-sm text-gray-500">
        It may have expired or been revoked. Ask the NHS chapter officer who shared
        it with you for a new link.
      </p>
    </div>
  );
}
