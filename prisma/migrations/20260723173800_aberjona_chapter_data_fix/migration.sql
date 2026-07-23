-- Rename any existing chapter still using the old generic default.
UPDATE "ChapterSettings" SET "chapterName" = 'Aberjona NHS Chapter' WHERE "chapterName" = 'NHS Chapter';
