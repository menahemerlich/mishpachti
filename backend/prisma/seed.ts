import { PrismaClient, RoomType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] Ensuring family chat room exists...');

  const familyRoom = await prisma.chatRoom.findFirst({
    where: { type: RoomType.FAMILY },
  });

  if (!familyRoom) {
    const created = await prisma.chatRoom.create({
      data: {
        name: 'קבוצה משפחתית',
        type: RoomType.FAMILY,
      },
    });
    console.log(`[seed] Created family room: ${created.id}`);
  } else {
    console.log(`[seed] Family room already exists: ${familyRoom.id}`);
  }

  console.log('[seed] Done.');
}

main()
  .catch((e) => {
    console.error('[seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
