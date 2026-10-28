-- Add auditable candidate visibility, training, assessment, matching, and placement workflows.
CREATE TYPE "TrainingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'PASSED', 'FAILED');

ALTER TABLE "CandidateProfile"
ADD COLUMN "phone" VARCHAR(30),
ADD COLUMN "employerVisibilityConsentAt" TIMESTAMP(3);

ALTER TABLE "CandidateApplication"
ADD COLUMN "internalReviewNote" VARCHAR(2000),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reviewedById" UUID;

ALTER TABLE "HiringRequest"
ADD COLUMN "placedCount" INTEGER NOT NULL DEFAULT 0,
ADD CONSTRAINT "HiringRequest_placed_count_check"
  CHECK ("placedCount" >= 0 AND "placedCount" <= "hireCount");

CREATE TABLE "TrainingProgress" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "internalNote" VARCHAR(1000),
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrainingProgress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TrainingProgress_percentage_check" CHECK ("percentage" >= 0 AND "percentage" <= 100)
);

CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "score" DECIMAL(5,2),
    "internalNote" VARCHAR(1000),
    "completedAt" TIMESTAMP(3),
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Assessment_score_check" CHECK ("score" IS NULL OR ("score" >= 0 AND "score" <= 100))
);

CREATE TABLE "CandidateEmployerMatch" (
    "id" UUID NOT NULL,
    "candidateApplicationId" UUID NOT NULL,
    "hiringRequestId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "authorizedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CandidateEmployerMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Placement" (
    "id" UUID NOT NULL,
    "candidateApplicationId" UUID NOT NULL,
    "hiringRequestId" UUID NOT NULL,
    "placedById" UUID NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "internalNote" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" UUID NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainingProgress_applicationId_key" ON "TrainingProgress"("applicationId");
CREATE INDEX "TrainingProgress_status_updatedAt_idx" ON "TrainingProgress"("status", "updatedAt");
CREATE UNIQUE INDEX "Assessment_applicationId_key" ON "Assessment"("applicationId");
CREATE INDEX "Assessment_status_updatedAt_idx" ON "Assessment"("status", "updatedAt");
CREATE UNIQUE INDEX "CandidateEmployerMatch_candidateApplicationId_hiringRequestId_key"
  ON "CandidateEmployerMatch"("candidateApplicationId", "hiringRequestId");
CREATE INDEX "CandidateEmployerMatch_hiringRequestId_authorizedAt_idx"
  ON "CandidateEmployerMatch"("hiringRequestId", "authorizedAt");
CREATE INDEX "CandidateEmployerMatch_candidateApplicationId_authorizedAt_idx"
  ON "CandidateEmployerMatch"("candidateApplicationId", "authorizedAt");
CREATE UNIQUE INDEX "Placement_candidateApplicationId_key" ON "Placement"("candidateApplicationId");
CREATE INDEX "Placement_hiringRequestId_placedAt_idx" ON "Placement"("hiringRequestId", "placedAt");
CREATE INDEX "Placement_placedById_placedAt_idx" ON "Placement"("placedById", "placedAt");
CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx"
  ON "AuditLog"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

ALTER TABLE "CandidateApplication"
ADD CONSTRAINT "CandidateApplication_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TrainingProgress"
ADD CONSTRAINT "TrainingProgress_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "CandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "TrainingProgress_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assessment"
ADD CONSTRAINT "Assessment_applicationId_fkey"
FOREIGN KEY ("applicationId") REFERENCES "CandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Assessment_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CandidateEmployerMatch"
ADD CONSTRAINT "CandidateEmployerMatch_candidateApplicationId_fkey"
FOREIGN KEY ("candidateApplicationId") REFERENCES "CandidateApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CandidateEmployerMatch_hiringRequestId_fkey"
FOREIGN KEY ("hiringRequestId") REFERENCES "HiringRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "CandidateEmployerMatch_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Placement"
ADD CONSTRAINT "Placement_candidateApplicationId_fkey"
FOREIGN KEY ("candidateApplicationId") REFERENCES "CandidateApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Placement_hiringRequestId_fkey"
FOREIGN KEY ("hiringRequestId") REFERENCES "HiringRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
ADD CONSTRAINT "Placement_placedById_fkey"
FOREIGN KEY ("placedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
