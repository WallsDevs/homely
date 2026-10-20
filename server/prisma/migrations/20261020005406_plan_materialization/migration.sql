-- CreateTable
CREATE TABLE "PlanMaterialization" (
    "planId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanMaterialization_pkey" PRIMARY KEY ("planId","weekStart")
);

-- AddForeignKey
ALTER TABLE "PlanMaterialization" ADD CONSTRAINT "PlanMaterialization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TaskPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
