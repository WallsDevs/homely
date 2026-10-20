-- CreateTable
CREATE TABLE "PlanPause" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT,
    "planId" TEXT,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanPause_householdId_endsOn_idx" ON "PlanPause"("householdId", "endsOn");

-- AddForeignKey
ALTER TABLE "PlanPause" ADD CONSTRAINT "PlanPause_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPause" ADD CONSTRAINT "PlanPause_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPause" ADD CONSTRAINT "PlanPause_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TaskPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPause" ADD CONSTRAINT "PlanPause_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Membership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
