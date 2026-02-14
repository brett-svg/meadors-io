import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("move1234", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash }
  });

  const labelSizes = [
    {
      name: "Avery 5160",
      widthMm: 66.675,
      heightMm: 25.4,
      orientation: "landscape",
      marginTopMm: 2,
      marginRightMm: 2,
      marginBottomMm: 2,
      marginLeftMm: 2,
      safePaddingMm: 1,
      isPreset: true,
      isAvery5160Sheet: true
    },
    {
      name: "Generic 2x3 inch",
      widthMm: 76.2,
      heightMm: 50.8,
      orientation: "landscape",
      marginTopMm: 1,
      marginRightMm: 1,
      marginBottomMm: 1,
      marginLeftMm: 1,
      safePaddingMm: 1,
      isPreset: true
    },
    {
      name: "Supvan 50x30",
      widthMm: 50,
      heightMm: 30,
      orientation: "landscape",
      marginTopMm: 0.8,
      marginRightMm: 0.8,
      marginBottomMm: 0.8,
      marginLeftMm: 0.8,
      safePaddingMm: 1,
      isPreset: true
    },
    {
      name: "Supvan 50x40",
      widthMm: 50,
      heightMm: 40,
      orientation: "landscape",
      marginTopMm: 0.8,
      marginRightMm: 0.8,
      marginBottomMm: 0.8,
      marginLeftMm: 0.8,
      safePaddingMm: 1,
      isPreset: true
    },
    {
      name: "FlashLabel 40x30",
      widthMm: 40,
      heightMm: 30,
      orientation: "landscape",
      marginTopMm: 1,
      marginRightMm: 1,
      marginBottomMm: 1,
      marginLeftMm: 1,
      safePaddingMm: 1,
      isPreset: true
    },
    {
      // 4x6 inch — standard shipping/moving label. Use with inventory_4x6 template
      // to print room code, QR code, and full box contents on one label.
      name: "4x6 inch (inventory)",
      widthMm: 152.4,
      heightMm: 101.6,
      orientation: "landscape",
      marginTopMm: 3,
      marginRightMm: 3,
      marginBottomMm: 3,
      marginLeftMm: 3,
      safePaddingMm: 2,
      isPreset: true
    }
  ] as const;

  for (const size of labelSizes) {
    await prisma.labelSize.upsert({
      where: { id: `${size.name.toLowerCase().replace(/\s+/g, "-")}` },
      update: size,
      create: { id: `${size.name.toLowerCase().replace(/\s+/g, "-")}`, ...size }
    });
  }

  const sampleBoxes = [
    {
      shortCode: "BX-000001",
      house: "Main House",
      floor: "1",
      room: "Kitchen",
      zone: "A",
      roomCode: "KIT",
      category: "Cookware",
      priority: "high",
      fragile: true,
      status: "packed",
      notes: "Plates and glasses",
      condition: "ok"
    },
    {
      shortCode: "BX-000002",
      house: "Main House",
      floor: "2",
      room: "Primary Bedroom",
      zone: "Closet",
      roomCode: "PB",
      category: "Clothing",
      priority: "medium",
      fragile: false,
      status: "delivered",
      notes: "Seasonal clothes",
      condition: "ok"
    },
    {
      shortCode: "BX-000003",
      house: "Main House",
      floor: "1",
      room: "Garage",
      zone: "Tools",
      roomCode: "GAR",
      category: "Tools",
      priority: "low",
      fragile: false,
      status: "in_transit",
      notes: "Power tools and accessories",
      condition: "ok"
    }
  ] as const;

  for (const box of sampleBoxes) {
    const created = await prisma.box.upsert({
      where: { shortCode: box.shortCode },
      update: box,
      create: box
    });

    await prisma.item.createMany({
      data: [
        { boxId: created.id, name: "Sample item", qty: 2, packed: true, tags: ["sample"] },
        { boxId: created.id, name: "Fragile sample", qty: 1, packed: true, tags: ["fragile"] }
      ],
      skipDuplicates: true
    });
  }

  await prisma.bundle.upsert({
    where: { name: "Bathroom kit" },
    update: {
      itemsJson: [
        { name: "toothbrush", qty: 2, tags: ["bathroom"] },
        { name: "soap", qty: 4, tags: ["bathroom"] }
      ]
    },
    create: {
      name: "Bathroom kit",
      itemsJson: [
        { name: "toothbrush", qty: 2, tags: ["bathroom"] },
        { name: "soap", qty: 4, tags: ["bathroom"] }
      ]
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
