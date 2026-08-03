-- STORY-100: live-class recording + post-class XP
--
-- `live_classes.recordingUrl` holds the posted-recording link, set by an
-- admin after the class happens. `live_class_registrations.watchedRecordingAt`
-- guards against re-awarding XP if a student marks the recording watched
-- more than once.

ALTER TABLE "live_classes" ADD COLUMN "recordingUrl" TEXT;

ALTER TABLE "live_class_registrations" ADD COLUMN "watchedRecordingAt" TIMESTAMP(3);
