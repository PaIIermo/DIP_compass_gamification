-- CreateTable
CREATE TABLE "DecayLookup" (
    "days" INTEGER NOT NULL,
    "decay_factor" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DecayLookup_pkey" PRIMARY KEY ("days")
);
