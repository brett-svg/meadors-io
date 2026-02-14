-- CreateEnum
CREATE TYPE "BoxStatus" AS ENUM ('draft', 'packed', 'in_transit', 'delivered', 'unpacked');
CREATE TYPE "BoxCondition" AS ENUM ('ok', 'damaged');
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high');
CREATE TYPE "Orientation" AS ENUM ('portrait', 'landscape');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LabelSize" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "widthMm" DOUBLE PRECISION NOT NULL,
  "heightMm" DOUBLE PRECISION NOT NULL,
  "orientation" "Orientation" NOT NULL DEFAULT 'portrait',
  "marginTopMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "marginRightMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "marginBottomMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "marginLeftMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "safePaddingMm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "cornerRadiusMm" DOUBLE PRECISION,
  "isPreset" BOOLEAN NOT NULL DEFAULT false,
  "isAvery5160Sheet" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LabelSize_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Box" (
  "id" UUID NOT NULL,
  "shortCode" TEXT NOT NULL,
  "house" TEXT NOT NULL,
  "floor" TEXT NOT NULL,
  "room" TEXT NOT NULL,
  "zone" TEXT,
  "roomCode" TEXT NOT NULL,
  "category" TEXT,
  "priority" "Priority" NOT NULL DEFAULT 'medium',
  "fragile" BOOLEAN NOT NULL DEFAULT false,
  "status" "BoxStatus" NOT NULL DEFAULT 'draft',
  "notes" TEXT,
  "condition" "BoxCondition" NOT NULL DEFAULT 'ok',
  "damageNotes" TEXT,
  "estimatedValue" DECIMAL(10,2),
  "storageArea" TEXT,
  "storageShelf" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Box_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Item" (
  "id" TEXT NOT NULL,
  "boxId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "qty" INTEGER NOT NULL DEFAULT 1,
  "packed" BOOLEAN NOT NULL DEFAULT false,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Photo" (
  "id" TEXT NOT NULL,
  "boxId" UUID NOT NULL,
  "url" TEXT NOT NULL,
  "caption" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bundle" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "itemsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ActivityLog" (
  "id" TEXT NOT NULL,
  "boxId" UUID,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Box_shortCode_key" ON "Box"("shortCode");
CREATE UNIQUE INDEX "Bundle_name_key" ON "Bundle"("name");

ALTER TABLE "Item" ADD CONSTRAINT "Item_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "Box"("id") ON DELETE CASCADE ON UPDATE CASCADE;
