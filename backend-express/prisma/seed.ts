/**
 * Database Seed Script
 * Run: npx ts-node prisma/seed.ts
 *
 * Seeds:
 *  - 1 Admin user
 *  - 1 Librarian user
 *  - 2 Reader users
 *  - Core system configurations
 *  - 2 Library branches
 *  - 3 Book categories
 *  - 3 Sample books
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ─── Branches ─────────────────────────────────────────────
  const branch1 = await prisma.branch.upsert({
    where: { id: 'branch-cs-01' },
    update: {},
    create: {
      id: 'branch-cs-01',
      name: 'Thư viện Cơ sở 1 - Lý Thường Kiệt',
      address: '268 Lý Thường Kiệt, Phường 14, Quận 10, TP.HCM',
      phone: '028-3864-7256',
      isActive: true,
    },
  });

  const branch2 = await prisma.branch.upsert({
    where: { id: 'branch-cs-02' },
    update: {},
    create: {
      id: 'branch-cs-02',
      name: 'Thư viện Cơ sở 2 - Dĩ An',
      address: 'Khu phố 6, Phường Linh Trung, Tp. Thủ Đức, TP.HCM',
      phone: '028-7300-4866',
      isActive: true,
    },
  });

  console.log('✅ Branches seeded');

  // ─── System Configurations ────────────────────────────────
  const configs = [
    { key: 'borrow_duration_days',      value: '14',  description: 'Số ngày mượn mặc định' },
    { key: 'max_borrow_limit_reader',   value: '5',   description: 'Số sách tối đa bạn đọc được mượn' },
    { key: 'max_borrow_limit_faculty',  value: '10',  description: 'Số sách tối đa giảng viên được mượn' },
    { key: 'fine_rate_per_day',         value: '2000',description: 'Mức phạt trễ hạn (VNĐ/ngày)' },
    { key: 'max_renew_count',           value: '2',   description: 'Số lần gia hạn tối đa' },
    { key: 'renew_duration_days',       value: '7',   description: 'Số ngày gia hạn mỗi lần' },
    {
      key: 'holiday_dates',
      value: JSON.stringify(['2025-01-01','2025-04-30','2025-05-01','2025-09-02','2025-12-25']),
      description: 'Danh sách ngày nghỉ lễ không tính phạt (ISO format)',
    },
  ];

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: cfg,
    });
  }
  console.log('✅ System configs seeded');

  // ─── Users ────────────────────────────────────────────────
  const hashPw = (pw: string) => bcrypt.hash(pw, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.edu.vn' },
    update: {},
    create: {
      email: 'admin@library.edu.vn',
      passwordHash: await hashPw('Admin@123456'),
      fullName: 'Quản Trị Viên',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      branchId: branch1.id,
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: 'librarian@library.edu.vn' },
    update: {},
    create: {
      email: 'librarian@library.edu.vn',
      passwordHash: await hashPw('Librarian@123'),
      fullName: 'Nguyễn Thủ Thư',
      role: Role.LIBRARIAN,
      status: UserStatus.ACTIVE,
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reader1@student.edu.vn' },
    update: {},
    create: {
      email: 'reader1@student.edu.vn',
      passwordHash: await hashPw('Reader@123'),
      fullName: 'Trần Văn Bạn Đọc',
      phone: '0901234567',
      role: Role.READER,
      status: UserStatus.ACTIVE,
      branchId: branch1.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'reader2@student.edu.vn' },
    update: {},
    create: {
      email: 'reader2@student.edu.vn',
      passwordHash: await hashPw('Reader@123'),
      fullName: 'Lê Thị Sinh Viên',
      phone: '0912345678',
      role: Role.READER,
      status: UserStatus.ACTIVE,
      branchId: branch2.id,
    },
  });

  console.log('✅ Users seeded');

  // ─── Categories ───────────────────────────────────────────
  const catCS = await prisma.category.upsert({
    where: { name: 'Khoa học Máy tính' },
    update: {},
    create: { name: 'Khoa học Máy tính', description: 'Lập trình, Giải thuật, AI, CSDL' },
  });

  const catLit = await prisma.category.upsert({
    where: { name: 'Văn học' },
    update: {},
    create: { name: 'Văn học', description: 'Tiểu thuyết, Thơ, Truyện ngắn' },
  });

  const catEcon = await prisma.category.upsert({
    where: { name: 'Kinh tế - Quản trị' },
    update: {},
    create: { name: 'Kinh tế - Quản trị', description: 'Quản lý, Marketing, Tài chính' },
  });

  console.log('✅ Categories seeded');

  // ─── Books ────────────────────────────────────────────────
  const book1 = await prisma.book.upsert({
    where: { isbn: '9780132350884' },
    update: {},
    create: {
      isbn: '9780132350884',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      authorNames: ['Robert C. Martin'],
      publisher: 'Prentice Hall',
      publishYear: 2008,
      language: 'en',
      categoryId: catCS.id,
      description: 'Cuốn sách kinh điển về viết code sạch, dễ đọc và bảo trì.',
      totalCopies: 5,
      availableCopies: 5,
      createdById: librarian.id,
    },
  });

  const book2 = await prisma.book.upsert({
    where: { isbn: '9780307887894' },
    update: {},
    create: {
      isbn: '9780307887894',
      title: 'Nhà Giả Kim',
      authorNames: ['Paulo Coelho'],
      publisher: 'HarperOne',
      publishYear: 1988,
      language: 'vi',
      categoryId: catLit.id,
      description: 'Câu chuyện về Santiago - cậu bé chăn cừu người Andalusia và hành trình tìm kiếm kho báu.',
      totalCopies: 8,
      availableCopies: 8,
      createdById: librarian.id,
    },
  });

  await prisma.book.upsert({
    where: { isbn: '9781591846444' },
    update: {},
    create: {
      isbn: '9781591846444',
      title: 'Zero to One: Notes on Startups',
      authorNames: ['Peter Thiel', 'Blake Masters'],
      publisher: 'Crown Business',
      publishYear: 2014,
      language: 'en',
      categoryId: catEcon.id,
      description: 'Peter Thiel chia sẻ những bài học từ PayPal và các khoản đầu tư vào startup công nghệ.',
      totalCopies: 3,
      availableCopies: 3,
      createdById: librarian.id,
    },
  });

  // Create physical copies for book1
  const existingCopies = await prisma.physicalCopy.count({ where: { bookId: book1.id } });
  if (existingCopies === 0) {
    for (let i = 1; i <= 5; i++) {
      await prisma.physicalCopy.create({
        data: {
          bookId: book1.id,
          branchId: i <= 3 ? branch1.id : branch2.id,
          barcode: `BOOK-CC-${String(i).padStart(4, '0')}`,
          location: `Kệ A${i}`,
        },
      });
    }
  }

  // Create physical copies for book2
  const existingCopies2 = await prisma.physicalCopy.count({ where: { bookId: book2.id } });
  if (existingCopies2 === 0) {
    for (let i = 1; i <= 8; i++) {
      await prisma.physicalCopy.create({
        data: {
          bookId: book2.id,
          branchId: i <= 4 ? branch1.id : branch2.id,
          barcode: `BOOK-NK-${String(i).padStart(4, '0')}`,
          location: `Kệ B${i}`,
        },
      });
    }
  }

  console.log('✅ Books and physical copies seeded');

  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin:     admin@library.edu.vn     / Admin@123456');
  console.log('  Librarian: librarian@library.edu.vn / Librarian@123');
  console.log('  Reader 1:  reader1@student.edu.vn   / Reader@123');
  console.log('  Reader 2:  reader2@student.edu.vn   / Reader@123');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
