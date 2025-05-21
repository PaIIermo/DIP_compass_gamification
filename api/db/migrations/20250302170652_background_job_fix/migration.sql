-- CreateEnum
CREATE TYPE "EarlyReviewFieldKey" AS ENUM ('SCIENFITIC_QUALITY', 'NOVELTY_ORIGINALITY', 'QUALITY_OF_WRITING', 'TOPICAL_SUITABILITY', 'OVERALL_RECOMMENDATION', 'PROPOSE_FOR_JOURNAL', 'PROPOSE_FOR_MAGAZINE', 'COMMENTS_FOR_AUTHORS', 'COMMENTS_FOR_TPC', 'EXPERTISE_CONFIDENCE', 'LANG_AND_GRAMMAR_OK', 'SEND_TO_WRITING_EXPERT');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('OPEN_FOR_SUBMISSION', 'CALL_FOR_PROGRAM_CHAIR', 'CALL_FOR_WORKSHOP_CHAIR', 'CALL_FOR_TPC_MEMBERS', 'PROPOSAL', 'UNDER_EVALUATION', 'APPROVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('GENERAL_CHAIR', 'PROGRAM_CHAIR', 'PROGRAM_MEMBER', 'LOCAL_CHAIR', 'PUBLICITY_CHAIR', 'SPONSORSHIP_CHAIR', 'WEB_CHAIR', 'WORKSHOPS_CHAIR', 'PUBLICATIONS_CHAIR', 'REGISTRANT', 'REVIEWER', 'AUTHOR_ACCEPTED', 'CONFERENCE_COORDINATOR', 'KEYNOTE_SPEAKER');

-- CreateEnum
CREATE TYPE "SubmissionPhase" AS ENUM ('DRAFT', 'WITHDRAWN', 'CAMERA_READY_NOT_SIGNED', 'SUBMITTED', 'CAMERA_READY', 'REJECTED', 'REJECTED_IN_VALIDATION', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('INITIAL_SETUP', 'PAPER_SUBMISSION', 'SUBMISSION_VALIDATION', 'PAPER_ASSIGNMENT', 'REVIEW_MANAGEMENT', 'DECISION_AND_NOTIFICATION', 'CAMERA_READY');

-- CreateEnum
CREATE TYPE "TrackType" AS ENUM ('WORKSHOP', 'DEMO', 'POSTER', 'INVITED', 'SMART_SUBMIT', 'TECHNICAL', 'OTHER');

-- CreateTable
CREATE TABLE "AccountPreference" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,

    CONSTRAINT "AccountPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActiveUserStatus" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActiveUserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationForEvent" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" "RoleType" NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "pending" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "is_invited" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "ApplicationForEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaOfInterest" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "AreaOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthorRevealed" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "AuthorRevealed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" SERIAL NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "handler" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "runAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BestPaperAward" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "conference_manager_id" INTEGER NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "BestPaperAward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidForReview" (
    "id" SERIAL NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifications" TEXT NOT NULL,
    "opt_for_bidding" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BidForReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "subject" TEXT,
    "submission_id" INTEGER,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoAuthor" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "CoAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityFeed" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "image" TEXT,
    "type" TEXT NOT NULL DEFAULT 'default',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "CommunityFeed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsideredToSubmitToEvent" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsideredToSubmitToEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyReviewField" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "key" "EarlyReviewFieldKey" NOT NULL,
    "value" TEXT NOT NULL,
    "early_review_id" INTEGER NOT NULL,

    CONSTRAINT "EarlyReviewField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyReviewProposal" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "pending" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "EarlyReviewProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "lisperator_id" INTEGER,
    "acronym_year" TEXT,
    "acronym" TEXT,
    "t_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "place" TEXT,
    "website" TEXT,
    "sync_last" TIMESTAMP(3),
    "conference_proposal" BOOLEAN NOT NULL DEFAULT false,
    "about" TEXT,
    "program_public" BOOLEAN NOT NULL DEFAULT false,
    "open_for_registration" BOOLEAN NOT NULL DEFAULT false,
    "proposal_deadline" TIMESTAMP(3),
    "owner_id" INTEGER NOT NULL,
    "statuses" "EventStatus"[],
    "period" "SubmissionStatus" NOT NULL DEFAULT 'INITIAL_SETUP',
    "conference_value" DECIMAL(10,3) DEFAULT 0,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeedback" (
    "id" SERIAL NOT NULL,
    "comment" TEXT,
    "t_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "t_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "event_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "EventFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTopic" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,

    CONSTRAINT "EventTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalPublication" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "image" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMP(3),
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "ExternalPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "submissionId" INTEGER,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationToEvent" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "declined" BOOLEAN NOT NULL DEFAULT false,
    "recipient_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "InvitationToEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordInSubmission" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,

    CONSTRAINT "KeywordInSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "full_paper_request" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suggested_readings_ids" INTEGER[],
    "suggested_readings_links" TEXT[],
    "sender_id" INTEGER NOT NULL,
    "chat_id" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "link" TEXT,
    "type" TEXT NOT NULL DEFAULT 'notification',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_id" INTEGER NOT NULL,
    "sender_id" INTEGER,
    "event_id" INTEGER,
    "submission_id" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presentation" (
    "id" SERIAL NOT NULL,
    "paper_id" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "speaker_id" INTEGER,
    "session_id" INTEGER NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proceeding" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "eudl_url" TEXT,
    "image" TEXT,
    "accessibility_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessibility_end" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "Proceeding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" SERIAL NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "pending" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT,
    "type" TEXT NOT NULL DEFAULT 'mentorship',
    "sender_id" INTEGER NOT NULL,
    "receiver_id" INTEGER NOT NULL,
    "submission_id" INTEGER,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "doi" VARCHAR(255),
    "conference" INTEGER,
    "userid" INTEGER,
    "review_score" DECIMAL(10,3),
    "base_score" DECIMAL(10,3),
    "overall_score" DECIMAL(10,3),
    "citation_count" INTEGER DEFAULT 0,
    "last_edited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temp_compass_id" INTEGER,
    "day" INTEGER NOT NULL DEFAULT 1,
    "event_id" INTEGER NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "temp_compass_id" INTEGER,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "t_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "t_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pdf" TEXT,
    "confy_id" INTEGER,
    "early_abstract" BOOLEAN NOT NULL DEFAULT false,
    "early_draft" BOOLEAN NOT NULL DEFAULT false,
    "shared_count" INTEGER NOT NULL DEFAULT 0,
    "period" "SubmissionPhase" NOT NULL DEFAULT 'DRAFT',
    "status" "SubmissionStatus" NOT NULL DEFAULT 'INITIAL_SETUP',
    "area_of_interest_id" INTEGER,
    "track_id" INTEGER,
    "event_id" INTEGER,
    "mentor_id" INTEGER,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFeedback" (
    "id" SERIAL NOT NULL,
    "originality" INTEGER NOT NULL,
    "relevancy" INTEGER NOT NULL,
    "comment" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "t_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "t_modified" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "suggested_readings_ids" INTEGER[],
    "suggested_readings_links" TEXT[],
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "SubmissionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionLog" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submission_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "SubmissionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_id" INTEGER NOT NULL,
    "lisperator_id" INTEGER,
    "type" "TrackType" NOT NULL DEFAULT 'TECHNICAL',
    "period" "SubmissionStatus" NOT NULL,
    "invite_only" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "alias_name" TEXT,
    "email" TEXT NOT NULL,
    "uuid" TEXT NOT NULL,
    "affiliation" TEXT,
    "bio" TEXT,
    "profile_image" TEXT,
    "lisperator_id" INTEGER NOT NULL,
    "lisperator_group" TEXT,
    "t_created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_sync" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_profile_public" BOOLEAN NOT NULL DEFAULT true,
    "place" TEXT,
    "first_login" BOOLEAN NOT NULL DEFAULT true,
    "fellow" BOOLEAN NOT NULL DEFAULT false,
    "tutorial_completed" BOOLEAN NOT NULL DEFAULT false,
    "h_index" INTEGER DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccountPreferenceBlocklist" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "preference_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccountPreferenceBlocklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAreaOfInterest" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "area_of_interest_id" INTEGER NOT NULL,

    CONSTRAINT "UserAreaOfInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserInEvent" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "event_id" INTEGER NOT NULL,
    "role" "RoleType" NOT NULL DEFAULT 'REGISTRANT',

    CONSTRAINT "UserInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPoint" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_type" TEXT NOT NULL DEFAULT 'Not defined',
    "type" INTEGER NOT NULL,

    CONSTRAINT "UserPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReporting" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "reported_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,

    CONSTRAINT "UserReporting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserResearchTopic" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "keyword_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserResearchTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSocialAccount" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER NOT NULL,
    "social_account_id" INTEGER NOT NULL,

    CONSTRAINT "UserSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserStatus" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "UserStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_event_areas_of_interest" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_ChatToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_appreciated_events" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_considered_events" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_followed_events" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_downloaded_files" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_read_by" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_appreciated_presentations" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_appreciated_submissions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_followed_submissions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_relevant_submissions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_blocked_users" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "_followings" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountPreference_label_key" ON "AccountPreference"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Event_lisperator_id_key" ON "Event"("lisperator_id");

-- CreateIndex
CREATE UNIQUE INDEX "Event_title_acronym_year_key" ON "Event"("title", "acronym_year");

-- CreateIndex
CREATE UNIQUE INDEX "File_uuid_key" ON "File"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_label_key" ON "Keyword"("label");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_uuid_key" ON "User"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "User_lisperator_id_key" ON "User"("lisperator_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserStatus_label_key" ON "UserStatus"("label");

-- CreateIndex
CREATE UNIQUE INDEX "_event_areas_of_interest_AB_unique" ON "_event_areas_of_interest"("A", "B");

-- CreateIndex
CREATE INDEX "_event_areas_of_interest_B_index" ON "_event_areas_of_interest"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ChatToUser_AB_unique" ON "_ChatToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_ChatToUser_B_index" ON "_ChatToUser"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_appreciated_events_AB_unique" ON "_appreciated_events"("A", "B");

-- CreateIndex
CREATE INDEX "_appreciated_events_B_index" ON "_appreciated_events"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_considered_events_AB_unique" ON "_considered_events"("A", "B");

-- CreateIndex
CREATE INDEX "_considered_events_B_index" ON "_considered_events"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_followed_events_AB_unique" ON "_followed_events"("A", "B");

-- CreateIndex
CREATE INDEX "_followed_events_B_index" ON "_followed_events"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_downloaded_files_AB_unique" ON "_downloaded_files"("A", "B");

-- CreateIndex
CREATE INDEX "_downloaded_files_B_index" ON "_downloaded_files"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_read_by_AB_unique" ON "_read_by"("A", "B");

-- CreateIndex
CREATE INDEX "_read_by_B_index" ON "_read_by"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_appreciated_presentations_AB_unique" ON "_appreciated_presentations"("A", "B");

-- CreateIndex
CREATE INDEX "_appreciated_presentations_B_index" ON "_appreciated_presentations"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_appreciated_submissions_AB_unique" ON "_appreciated_submissions"("A", "B");

-- CreateIndex
CREATE INDEX "_appreciated_submissions_B_index" ON "_appreciated_submissions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_followed_submissions_AB_unique" ON "_followed_submissions"("A", "B");

-- CreateIndex
CREATE INDEX "_followed_submissions_B_index" ON "_followed_submissions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_relevant_submissions_AB_unique" ON "_relevant_submissions"("A", "B");

-- CreateIndex
CREATE INDEX "_relevant_submissions_B_index" ON "_relevant_submissions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_blocked_users_AB_unique" ON "_blocked_users"("A", "B");

-- CreateIndex
CREATE INDEX "_blocked_users_B_index" ON "_blocked_users"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_followings_AB_unique" ON "_followings"("A", "B");

-- CreateIndex
CREATE INDEX "_followings_B_index" ON "_followings"("B");

-- AddForeignKey
ALTER TABLE "ActiveUserStatus" ADD CONSTRAINT "ActiveUserStatus_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "UserStatus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveUserStatus" ADD CONSTRAINT "ActiveUserStatus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationForEvent" ADD CONSTRAINT "ApplicationForEvent_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationForEvent" ADD CONSTRAINT "ApplicationForEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorRevealed" ADD CONSTRAINT "AuthorRevealed_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthorRevealed" ADD CONSTRAINT "AuthorRevealed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPaperAward" ADD CONSTRAINT "BestPaperAward_conference_manager_id_fkey" FOREIGN KEY ("conference_manager_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPaperAward" ADD CONSTRAINT "BestPaperAward_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BestPaperAward" ADD CONSTRAINT "BestPaperAward_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidForReview" ADD CONSTRAINT "BidForReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidForReview" ADD CONSTRAINT "BidForReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoAuthor" ADD CONSTRAINT "CoAuthor_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoAuthor" ADD CONSTRAINT "CoAuthor_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsideredToSubmitToEvent" ADD CONSTRAINT "ConsideredToSubmitToEvent_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsideredToSubmitToEvent" ADD CONSTRAINT "ConsideredToSubmitToEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyReviewField" ADD CONSTRAINT "EarlyReviewField_early_review_id_fkey" FOREIGN KEY ("early_review_id") REFERENCES "EarlyReviewProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyReviewProposal" ADD CONSTRAINT "EarlyReviewProposal_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyReviewProposal" ADD CONSTRAINT "EarlyReviewProposal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeedback" ADD CONSTRAINT "EventFeedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTopic" ADD CONSTRAINT "EventTopic_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTopic" ADD CONSTRAINT "EventTopic_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalPublication" ADD CONSTRAINT "ExternalPublication_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToEvent" ADD CONSTRAINT "InvitationToEvent_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToEvent" ADD CONSTRAINT "InvitationToEvent_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationToEvent" ADD CONSTRAINT "InvitationToEvent_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordInSubmission" ADD CONSTRAINT "KeywordInSubmission_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeywordInSubmission" ADD CONSTRAINT "KeywordInSubmission_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_speaker_id_fkey" FOREIGN KEY ("speaker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proceeding" ADD CONSTRAINT "Proceeding_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_area_of_interest_id_fkey" FOREIGN KEY ("area_of_interest_id") REFERENCES "AreaOfInterest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "Track"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFeedback" ADD CONSTRAINT "SubmissionFeedback_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFeedback" ADD CONSTRAINT "SubmissionFeedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionLog" ADD CONSTRAINT "SubmissionLog_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionLog" ADD CONSTRAINT "SubmissionLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccountPreferenceBlocklist" ADD CONSTRAINT "UserAccountPreferenceBlocklist_preference_id_fkey" FOREIGN KEY ("preference_id") REFERENCES "AccountPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccountPreferenceBlocklist" ADD CONSTRAINT "UserAccountPreferenceBlocklist_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAreaOfInterest" ADD CONSTRAINT "UserAreaOfInterest_area_of_interest_id_fkey" FOREIGN KEY ("area_of_interest_id") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAreaOfInterest" ADD CONSTRAINT "UserAreaOfInterest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInEvent" ADD CONSTRAINT "UserInEvent_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserInEvent" ADD CONSTRAINT "UserInEvent_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPoint" ADD CONSTRAINT "UserPoint_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReporting" ADD CONSTRAINT "UserReporting_reported_id_fkey" FOREIGN KEY ("reported_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReporting" ADD CONSTRAINT "UserReporting_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResearchTopic" ADD CONSTRAINT "UserResearchTopic_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserResearchTopic" ADD CONSTRAINT "UserResearchTopic_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSocialAccount" ADD CONSTRAINT "UserSocialAccount_social_account_id_fkey" FOREIGN KEY ("social_account_id") REFERENCES "SocialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSocialAccount" ADD CONSTRAINT "UserSocialAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_event_areas_of_interest" ADD CONSTRAINT "_event_areas_of_interest_A_fkey" FOREIGN KEY ("A") REFERENCES "AreaOfInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_event_areas_of_interest" ADD CONSTRAINT "_event_areas_of_interest_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToUser" ADD CONSTRAINT "_ChatToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatToUser" ADD CONSTRAINT "_ChatToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_events" ADD CONSTRAINT "_appreciated_events_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_events" ADD CONSTRAINT "_appreciated_events_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_considered_events" ADD CONSTRAINT "_considered_events_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_considered_events" ADD CONSTRAINT "_considered_events_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followed_events" ADD CONSTRAINT "_followed_events_A_fkey" FOREIGN KEY ("A") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followed_events" ADD CONSTRAINT "_followed_events_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_downloaded_files" ADD CONSTRAINT "_downloaded_files_A_fkey" FOREIGN KEY ("A") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_downloaded_files" ADD CONSTRAINT "_downloaded_files_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_read_by" ADD CONSTRAINT "_read_by_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_read_by" ADD CONSTRAINT "_read_by_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_presentations" ADD CONSTRAINT "_appreciated_presentations_A_fkey" FOREIGN KEY ("A") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_presentations" ADD CONSTRAINT "_appreciated_presentations_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_submissions" ADD CONSTRAINT "_appreciated_submissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_appreciated_submissions" ADD CONSTRAINT "_appreciated_submissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followed_submissions" ADD CONSTRAINT "_followed_submissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followed_submissions" ADD CONSTRAINT "_followed_submissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_relevant_submissions" ADD CONSTRAINT "_relevant_submissions_A_fkey" FOREIGN KEY ("A") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_relevant_submissions" ADD CONSTRAINT "_relevant_submissions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_blocked_users" ADD CONSTRAINT "_blocked_users_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_blocked_users" ADD CONSTRAINT "_blocked_users_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followings" ADD CONSTRAINT "_followings_A_fkey" FOREIGN KEY ("A") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_followings" ADD CONSTRAINT "_followings_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
