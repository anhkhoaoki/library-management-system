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
 *  - 7 Book categories
 *  - 30 Sample books with real cover images (Open Library API)
 */

import { PrismaClient, Role, UserStatus } from '@prisma/client';
import { resolveDigitalContentUrl, resolveDirectStreamUrl } from '../src/modules/books/digital-content.map';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Open Library Covers API: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
const OL = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

// Placeholder cho sách tiếng Việt: dùng picsum.photos với seed từ 4 số cuối ISBN
// → mỗi cuốn sách có ảnh nhất quán và đẹp (không bị trống)
const VN = (isbn: string) => {
  const seed = parseInt(isbn.replace(/\D/g, '').slice(-6), 10) % 1000;
  return `https://picsum.photos/seed/${seed}/300/450`;
};


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
    { key: 'borrow_duration_days', value: '14', description: 'Số ngày mượn mặc định' },
    { key: 'max_borrow_limit_reader', value: '5', description: 'Số sách tối đa bạn đọc được mượn' },
    { key: 'max_borrow_limit_faculty', value: '10', description: 'Số sách tối đa giảng viên được mượn' },
    { key: 'fine_rate_per_day', value: '2000', description: 'Mức phạt trễ hạn (VNĐ/ngày)' },
    { key: 'max_renew_count', value: '2', description: 'Số lần gia hạn tối đa' },
    { key: 'renew_duration_days', value: '7', description: 'Số ngày gia hạn mỗi lần' },
    {
      key: 'holiday_dates',
      value: JSON.stringify(['2025-01-01', '2025-04-30', '2025-05-01', '2025-09-02', '2025-12-25']),
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

  // ─── Roles ────────────────────────────────────────────────
  const guestRole = await prisma.role.upsert({
    where: { name: 'GUEST' },
    update: {},
    create: { name: 'GUEST', description: 'Khách vãng lai' },
  });
  const readerRole = await prisma.role.upsert({
    where: { name: 'READER' },
    update: {},
    create: { name: 'READER', description: 'Người đọc (Sinh viên/Giảng viên)' },
  });
  const librarianRole = await prisma.role.upsert({
    where: { name: 'LIBRARIAN' },
    update: {},
    create: { name: 'LIBRARIAN', description: 'Thủ thư hệ thống' },
  });
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', description: 'Quản trị viên hệ thống' },
  });
  console.log('✅ Roles seeded');

  // ─── Users ────────────────────────────────────────────────
  const hashPw = (pw: string) => bcrypt.hash(pw, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@library.edu.vn' },
    update: {},
    create: {
      email: 'admin@library.edu.vn',
      passwordHash: await hashPw('Admin@123456'),
      fullName: 'Quản Trị Viên',
      roleId: adminRole.id,
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
      roleId: librarianRole.id,
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
      roleId: readerRole.id,
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
      roleId: readerRole.id,
      status: UserStatus.ACTIVE,
      branchId: branch2.id,
    },
  });

  // Nguyễn Anh Khoa (Reader)
  await prisma.user.upsert({
    where: { email: 'anhkhoaoki789@gmail.com' },
    update: {},
    create: {
      email: 'anhkhoaoki789@gmail.com',
      passwordHash: await hashPw('12345678'),
      fullName: 'Nguyễn Anh Khoa',
      studentId: '2211614',
      readerCode: '2211614',
      phone: '0987654321',
      roleId: readerRole.id,
      status: UserStatus.ACTIVE,
      branchId: branch2.id,
    },
  });

  // Nguyễn Anh Khoa (Librarian)
  await prisma.user.upsert({
    where: { email: 'anhkhoaoki@gmail.com' },
    update: {},
    create: {
      email: 'anhkhoaoki@gmail.com',
      passwordHash: await hashPw('12345678'),
      fullName: 'Trần Huy ',
      phone: '0912345679',
      roleId: librarianRole.id,
      status: UserStatus.ACTIVE,
      branchId: branch1.id,
    },
  });

  console.log('✅ Users seeded');

  // ─── Categories ───────────────────────────────────────────
  const catCS = await prisma.category.upsert({
    where: { name: 'Khoa học Máy tính' },
    update: {},
    create: { name: 'Khoa học Máy tính', description: 'Lập trình, Giải thuật, AI, CSDL, Mạng máy tính' },
  });

  const catLit = await prisma.category.upsert({
    where: { name: 'Văn học' },
    update: {},
    create: { name: 'Văn học', description: 'Tiểu thuyết, Thơ, Truyện ngắn, Văn học thế giới' },
  });

  const catEcon = await prisma.category.upsert({
    where: { name: 'Kinh tế - Quản trị' },
    update: {},
    create: { name: 'Kinh tế - Quản trị', description: 'Quản lý, Marketing, Tài chính, Khởi nghiệp' },
  });

  const catSci = await prisma.category.upsert({
    where: { name: 'Khoa học - Tự nhiên' },
    update: {},
    create: { name: 'Khoa học - Tự nhiên', description: 'Vật lý, Toán học, Sinh học, Hóa học' },
  });

  const catPsych = await prisma.category.upsert({
    where: { name: 'Tâm lý - Kỹ năng sống' },
    update: {},
    create: { name: 'Tâm lý - Kỹ năng sống', description: 'Tâm lý học, Phát triển bản thân, Kỹ năng mềm' },
  });

  const catPhilosophy = await prisma.category.upsert({
    where: { name: 'Triết học - Lịch sử' },
    update: {},
    create: { name: 'Triết học - Lịch sử', description: 'Triết học, Lịch sử thế giới, Văn hóa' },
  });

  const catEngineering = await prisma.category.upsert({
    where: { name: 'Kỹ thuật - Công nghệ' },
    update: {},
    create: { name: 'Kỹ thuật - Công nghệ', description: 'Điện tử, Cơ khí, Xây dựng, Tự động hóa' },
  });

  console.log('✅ Categories seeded');

  // ─── Books ────────────────────────────────────────────────
  // Cover images use Open Library Covers API: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg

  const booksData = [
    // ── Khoa học Máy tính ──────────────────────────────────────
    {
      isbn: '9780132350884',
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      authorNames: ['Robert C. Martin'],
      publisher: 'Prentice Hall',
      publishYear: 2008,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9780132350884'),
      description: 'Cuốn sách kinh điển về viết code sạch, dễ đọc và bảo trì. Robert Martin (Uncle Bob) hướng dẫn các nguyên tắc, mẫu thiết kế và thực hành tốt nhất để tạo ra phần mềm chất lượng cao.',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '9780201633610',
      title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
      authorNames: ['Erich Gamma', 'Richard Helm', 'Ralph Johnson', 'John Vlissides'],
      publisher: 'Addison-Wesley',
      publishYear: 1994,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9780201633610'),
      description: 'Cuốn sách "Gang of Four" kinh điển giới thiệu 23 mẫu thiết kế phần mềm hướng đối tượng. Được coi là nền tảng của kỹ thuật phần mềm hiện đại.',
      totalCopies: 4,
      availableCopies: 4,
    },
    {
      isbn: '9780596517748',
      title: 'JavaScript: The Good Parts',
      authorNames: ['Douglas Crockford'],
      publisher: "O'Reilly Media",
      publishYear: 2008,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9780596517748'),
      description: 'Douglas Crockford phân tích và chắt lọc những phần tốt nhất của JavaScript - ngôn ngữ lập trình phổ biến nhất thế giới. Bắt buộc đọc cho mọi lập trình viên web.',
      totalCopies: 5,
      availableCopies: 4,
    },
    {
      isbn: '9781449373320',
      title: 'Learning Python',
      authorNames: ['Mark Lutz'],
      publisher: "O'Reilly Media",
      publishYear: 2013,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9781449373320'),
      description: 'Hướng dẫn toàn diện về Python - từ cơ bản đến nâng cao. Bao gồm cú pháp, lập trình hướng đối tượng, quản lý dữ liệu và nhiều chủ đề khác.',
      totalCopies: 7,
      availableCopies: 6,
    },
    {
      isbn: '9780262033848',
      title: 'Introduction to Algorithms',
      authorNames: ['Thomas H. Cormen', 'Charles E. Leiserson', 'Ronald L. Rivest', 'Clifford Stein'],
      publisher: 'MIT Press',
      publishYear: 2009,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9780262033848'),
      description: 'CLRS - Kinh thánh về thuật toán và cấu trúc dữ liệu. Cuốn sách giáo khoa chuẩn mực nhất về giải thuật, được sử dụng rộng rãi trong các trường đại học hàng đầu thế giới.',
      totalCopies: 8,
      availableCopies: 7,
    },
    {
      isbn: '9781491950357',
      title: 'Python for Data Analysis',
      authorNames: ['Wes McKinney'],
      publisher: "O'Reilly Media",
      publishYear: 2017,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9781491950357'),
      description: 'Tác giả thư viện pandas hướng dẫn phân tích dữ liệu với Python. Bao gồm NumPy, pandas, matplotlib và các công cụ phân tích dữ liệu thiết yếu.',
      totalCopies: 5,
      availableCopies: 5,
    },
    {
      isbn: '9781491912058',
      title: 'Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow',
      authorNames: ['Aurélien Géron'],
      publisher: "O'Reilly Media",
      publishYear: 2019,
      language: 'en',
      categoryId: catCS.id,
      coverImageUrl: OL('9781491912058'),
      description: 'Hướng dẫn thực hành Machine Learning từ cơ bản đến mạng nơ-ron sâu. Sử dụng Scikit-Learn, Keras và TensorFlow với hàng chục dự án thực tế.',
      totalCopies: 6,
      availableCopies: 5,
    },

    // ── Văn học ────────────────────────────────────────────────
    {
      isbn: '9780307887894',
      title: 'Nhà Giả Kim',
      authorNames: ['Paulo Coelho'],
      publisher: 'NXB Hội Nhà Văn',
      publishYear: 1988,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: OL('9780307887894'),
      description: 'Câu chuyện về Santiago - cậu bé chăn cừu người Andalusia và hành trình tìm kiếm kho báu. Cuốn sách bán chạy nhất mọi thời đại với hơn 65 triệu bản in tại 59 quốc gia.',
      totalCopies: 10,
      availableCopies: 9,
    },
    {
      isbn: '9780062316097',
      title: 'The Alchemist',
      authorNames: ['Paulo Coelho'],
      publisher: 'HarperOne',
      publishYear: 1988,
      language: 'en',
      categoryId: catLit.id,
      coverImageUrl: OL('9780062316097'),
      description: 'The Alchemist tells the mystical story of Santiago, an Andalusian shepherd boy who yearns to travel in search of a worldly treasure as extravagant as any ever found.',
      totalCopies: 8,
      availableCopies: 7,
    },
    {
      isbn: '9780141439518',
      title: 'Great Expectations',
      authorNames: ['Charles Dickens'],
      publisher: 'Penguin Classics',
      publishYear: 1861,
      language: 'en',
      categoryId: catLit.id,
      coverImageUrl: OL('9780141439518'),
      description: 'Kiệt tác của Dickens kể về hành trình trưởng thành của Pip từ cậu bé nghèo trở thành quý ông. Một trong những tác phẩm văn học Anh vĩ đại nhất mọi thời đại.',
      totalCopies: 5,
      availableCopies: 5,
    },
    {
      isbn: '9780743273565',
      title: 'The Great Gatsby',
      authorNames: ['F. Scott Fitzgerald'],
      publisher: 'Scribner',
      publishYear: 1925,
      language: 'en',
      categoryId: catLit.id,
      coverImageUrl: OL('9780743273565'),
      description: 'Tiểu thuyết kinh điển của văn học Mỹ khắc họa giới thượng lưu thời kỳ Jazz Age. Câu chuyện về giấc mơ Mỹ, tình yêu và bi kịch qua góc nhìn của Nick Carraway.',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '9780385333481',
      title: 'The Handmaid\'s Tale',
      authorNames: ['Margaret Atwood'],
      publisher: 'Anchor Books',
      publishYear: 1985,
      language: 'en',
      categoryId: catLit.id,
      coverImageUrl: OL('9780385333481'),
      description: 'Tiểu thuyết dystopian kinh điển của Margaret Atwood về một xã hội độc tài tương lai. Được chuyển thể thành series truyền hình nổi tiếng toàn cầu.',
      totalCopies: 4,
      availableCopies: 3,
    },
    {
      isbn: '9780525559474',
      title: 'The Midnight Library',
      authorNames: ['Matt Haig'],
      publisher: 'Viking',
      publishYear: 2020,
      language: 'en',
      categoryId: catLit.id,
      coverImageUrl: OL('9780525559474'),
      description: 'Cuốn tiểu thuyết cảm động về Nora Seed - người khám phá ra một thư viện kỳ diệu giữa sự sống và cái chết, nơi cô có thể sống những cuộc đời lẽ ra mình đã có.',
      totalCopies: 5,
      availableCopies: 4,
    },

    // ── Kinh tế - Quản trị ─────────────────────────────────────
    {
      isbn: '9781591846444',
      title: 'Zero to One: Notes on Startups, or How to Build the Future',
      authorNames: ['Peter Thiel', 'Blake Masters'],
      publisher: 'Crown Business',
      publishYear: 2014,
      language: 'en',
      categoryId: catEcon.id,
      coverImageUrl: OL('9781591846444'),
      description: 'Peter Thiel chia sẻ những bài học từ PayPal và các khoản đầu tư vào startup công nghệ. Một cẩm nang không thể thiếu cho những người muốn xây dựng tương lai.',
      totalCopies: 5,
      availableCopies: 4,
    },
    {
      isbn: '9781400202065',
      title: 'The Lean Startup',
      authorNames: ['Eric Ries'],
      publisher: 'Crown Business',
      publishYear: 2011,
      language: 'en',
      categoryId: catEcon.id,
      coverImageUrl: OL('9781400202065'),
      description: 'Phương pháp Lean Startup cách mạng hóa cách các doanh nghiệp được xây dựng và sản phẩm ra đời. Phương pháp giúp startup phát triển nhanh hơn và tiết kiệm nguồn lực hơn.',
      totalCopies: 6,
      availableCopies: 5,
    },
    {
      isbn: '9781501111105',
      title: 'Good to Great: Why Some Companies Make the Leap and Others Don\'t',
      authorNames: ['Jim Collins'],
      publisher: 'HarperBusiness',
      publishYear: 2001,
      language: 'en',
      categoryId: catEcon.id,
      coverImageUrl: OL('9781501111105'),
      description: 'Jim Collins và nhóm nghiên cứu phân tích điều gì tạo nên sự khác biệt giữa các công ty vĩ đại và công ty tốt. Dựa trên 5 năm nghiên cứu 1.435 công ty.',
      totalCopies: 4,
      availableCopies: 4,
    },
    {
      isbn: '9780062312006',
      title: 'The 4-Hour Workweek',
      authorNames: ['Timothy Ferriss'],
      publisher: 'Crown Publishers',
      publishYear: 2007,
      language: 'en',
      categoryId: catEcon.id,
      coverImageUrl: OL('9780062312006'),
      description: 'Tim Ferriss chia sẻ bí quyết thoát khỏi vòng lặp công việc 9-5, tận dụng outsourcing và tự động hóa để sống cuộc đời mơ ước với ít giờ làm việc hơn.',
      totalCopies: 5,
      availableCopies: 5,
    },
    {
      isbn: '9781501156700',
      title: 'Think and Grow Rich',
      authorNames: ['Napoleon Hill'],
      publisher: 'Sound Wisdom',
      publishYear: 1937,
      language: 'en',
      categoryId: catEcon.id,
      coverImageUrl: OL('9781501156700'),
      description: 'Cuốn sách về thành công và làm giàu cá nhân nổi tiếng nhất mọi thời đại. Napoleon Hill phỏng vấn hàng trăm triệu phú và đúc kết 13 nguyên tắc thành công.',
      totalCopies: 8,
      availableCopies: 7,
    },

    // ── Tâm lý - Kỹ năng sống ─────────────────────────────────
    {
      isbn: '9780062457714',
      title: 'Thinking, Fast and Slow',
      authorNames: ['Daniel Kahneman'],
      publisher: 'Farrar, Straus and Giroux',
      publishYear: 2011,
      language: 'en',
      categoryId: catPsych.id,
      coverImageUrl: OL('9780062457714'),
      description: 'Nhà tâm lý học đoạt Nobel Daniel Kahneman tiết lộ hai hệ thống suy nghĩ của não người - System 1 (nhanh, bản năng) và System 2 (chậm, lý trí). Nền tảng của kinh tế học hành vi.',
      totalCopies: 7,
      availableCopies: 6,
    },
    {
      isbn: '9780735224292',
      title: 'Atomic Habits',
      authorNames: ['James Clear'],
      publisher: 'Avery',
      publishYear: 2018,
      language: 'en',
      categoryId: catPsych.id,
      coverImageUrl: OL('9780735224292'),
      description: 'James Clear hướng dẫn cách xây dựng thói quen tốt và phá bỏ thói quen xấu thông qua những thay đổi nhỏ nhưng mạnh mẽ. Bestseller #1 trên New York Times.',
      totalCopies: 10,
      availableCopies: 8,
    },
    {
      isbn: '9780062457721',
      title: 'The Power of Now',
      authorNames: ['Eckhart Tolle'],
      publisher: 'New World Library',
      publishYear: 1997,
      language: 'en',
      categoryId: catPsych.id,
      coverImageUrl: OL('9781577314806'),
      description: 'Eckhart Tolle hướng dẫn sống trọn vẹn trong hiện tại để thoát khỏi nỗi đau và lo lắng. Cuốn sách tâm linh và self-help nổi tiếng nhất thế kỷ 21.',
      totalCopies: 6,
      availableCopies: 5,
    },
    {
      isbn: '9780553380163',
      title: 'Man\'s Search for Meaning',
      authorNames: ['Viktor E. Frankl'],
      publisher: 'Beacon Press',
      publishYear: 1946,
      language: 'en',
      categoryId: catPsych.id,
      coverImageUrl: OL('9780553380163'),
      description: 'Bác sĩ tâm thần Viktor Frankl kể về trải nghiệm sống sót trong trại tập trung Auschwitz và phương pháp trị liệu logotherapy - tìm kiếm ý nghĩa cuộc sống.',
      totalCopies: 5,
      availableCopies: 4,
    },

    // ── Khoa học - Tự nhiên ────────────────────────────────────
    {
      isbn: '9780553380392',
      title: 'A Brief History of Time',
      authorNames: ['Stephen Hawking'],
      publisher: 'Bantam Books',
      publishYear: 1988,
      language: 'en',
      categoryId: catSci.id,
      coverImageUrl: OL('9780553380392'),
      description: 'Stephen Hawking giải thích vũ trụ từ Big Bang đến hố đen cho độc giả phổ thông. Cuốn sách khoa học phổ thông bán chạy nhất mọi thời đại với hơn 10 triệu bản.',
      totalCopies: 6,
      availableCopies: 5,
    },
    {
      isbn: '9780393354690',
      title: 'The Selfish Gene',
      authorNames: ['Richard Dawkins'],
      publisher: 'Oxford University Press',
      publishYear: 1976,
      language: 'en',
      categoryId: catSci.id,
      coverImageUrl: OL('9780198788607'),
      description: 'Richard Dawkins cách mạng hóa hiểu biết về tiến hóa: không phải loài hay cá thể, mà gene mới là đơn vị chọn lọc tự nhiên. Cuốn sách đã thay đổi cách nhìn về sinh học tiến hóa.',
      totalCopies: 4,
      availableCopies: 4,
    },
    {
      isbn: '9780393337624',
      title: 'The Double Helix',
      authorNames: ['James D. Watson'],
      publisher: 'W. W. Norton & Company',
      publishYear: 1968,
      language: 'en',
      categoryId: catSci.id,
      coverImageUrl: OL('9780393337624'),
      description: 'James Watson kể lại hành trình khám phá cấu trúc DNA - một trong những phát hiện khoa học vĩ đại nhất thế kỷ 20. Kết hợp giữa hồi ký và khoa học hấp dẫn.',
      totalCopies: 3,
      availableCopies: 3,
    },

    // ── Triết học - Lịch sử ────────────────────────────────────
    {
      isbn: '9780062316103',
      title: 'Sapiens: A Brief History of Humankind',
      authorNames: ['Yuval Noah Harari'],
      publisher: 'Harper',
      publishYear: 2011,
      language: 'en',
      categoryId: catPhilosophy.id,
      coverImageUrl: OL('9780062316103'),
      description: 'Yuval Noah Harari trình bày lịch sử nhân loại từ Homo sapiens tiền sử đến thế giới hiện đại trong một tác phẩm đột phá. Bán chạy toàn cầu, dịch ra 45 ngôn ngữ.',
      totalCopies: 10,
      availableCopies: 9,
    },
    {
      isbn: '9780062316110',
      title: 'Homo Deus: A Brief History of Tomorrow',
      authorNames: ['Yuval Noah Harari'],
      publisher: 'Harper',
      publishYear: 2015,
      language: 'en',
      categoryId: catPhilosophy.id,
      coverImageUrl: OL('9780062316110'),
      description: 'Yuval Noah Harari khám phá tương lai của nhân loại với sự phát triển của AI, công nghệ sinh học và dữ liệu lớn. Con người sẽ trở thành gì trong 200 năm tới?',
      totalCopies: 7,
      availableCopies: 6,
    },
    {
      isbn: '9780143127741',
      title: 'The Republic',
      authorNames: ['Plato'],
      publisher: 'Penguin Classics',
      publishYear: -380,
      language: 'en',
      categoryId: catPhilosophy.id,
      coverImageUrl: OL('9780143127741'),
      description: 'Kiệt tác triết học của Plato về công lý, xã hội lý tưởng và bản chất của triết học. Một trong những tác phẩm có ảnh hưởng sâu rộng nhất trong lịch sử tư tưởng phương Tây.',
      totalCopies: 4,
      availableCopies: 4,
    },

    // ── Kỹ thuật - Công nghệ ───────────────────────────────────
    {
      isbn: '9780470458365',
      title: 'The Pragmatic Programmer: Your Journey to Mastery',
      authorNames: ['David Thomas', 'Andrew Hunt'],
      publisher: 'Addison-Wesley',
      publishYear: 2019,
      language: 'en',
      categoryId: catEngineering.id,
      coverImageUrl: OL('9780135957059'),
      description: 'Hướng dẫn toàn diện về tư duy và thực hành của lập trình viên chuyên nghiệp. Bao gồm mọi khía cạnh từ thiết kế phần mềm đến quản lý dự án và phát triển bản thân.',
      totalCopies: 5,
      availableCopies: 4,
    },
    {
      isbn: '9780321125217',
      title: 'Domain-Driven Design',
      authorNames: ['Eric Evans'],
      publisher: 'Addison-Wesley',
      publishYear: 2003,
      language: 'en',
      categoryId: catEngineering.id,
      coverImageUrl: OL('9780321125217'),
      description: 'Eric Evans giới thiệu phương pháp Domain-Driven Design (DDD) - cách tiếp cận thiết kế phần mềm phức tạp dựa trên mô hình nghiệp vụ. Cuốn sách nền tảng của kiến trúc hiện đại.',
      totalCopies: 4,
      availableCopies: 3,
    },
    {
      isbn: '9781491920497',
      title: 'Building Microservices: Designing Fine-Grained Systems',
      authorNames: ['Sam Newman'],
      publisher: "O'Reilly Media",
      publishYear: 2015,
      language: 'en',
      categoryId: catEngineering.id,
      coverImageUrl: OL('9781491950357'),
      description: 'Sam Newman hướng dẫn thiết kế và triển khai hệ thống microservices từ A đến Z. Bao gồm phân tách dịch vụ, giao tiếp, bảo mật và triển khai trong môi trường thực tế.',
      totalCopies: 5,
      availableCopies: 5,
    },

    // ══════════════════════════════════════════════════════════
    // ── SÁCH TIẾNG VIỆT ────────────────────────────────────────
    // ══════════════════════════════════════════════════════════

    // ── Lập trình & Công nghệ (Tiếng Việt) ────────────────────
    {
      isbn: '9786049540738',
      title: 'Lập trình Python cơ bản',
      authorNames: ['Nguyễn Mạnh Hùng'],
      publisher: 'NXB Thông tin và Truyền thông',
      publishYear: 2021,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049540738'),
      description: 'Cuốn sách hướng dẫn lập trình Python từ đầu cho người mới bắt đầu. Bao gồm cú pháp cơ bản, lập trình hướng đối tượng, xử lý file, và các dự án thực hành thiết thực.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786040062642',
      title: 'Nhập môn Cấu trúc Dữ liệu và Giải thuật',
      authorNames: ['Đinh Mạnh Tường'],
      publisher: 'NXB Khoa học và Kỹ thuật',
      publishYear: 2020,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786040062642'),
      description: 'Giáo trình chuẩn về cấu trúc dữ liệu và giải thuật dành cho sinh viên đại học công nghệ thông tin. Bao gồm mảng, danh sách liên kết, cây, đồ thị, sắp xếp và tìm kiếm.',
      totalCopies: 10,
      availableCopies: 10,
    },
    {
      isbn: '9786049543951',
      title: 'Học máy với Python: Từ cơ bản đến ứng dụng',
      authorNames: ['Trần Minh Khoa', 'Lê Thanh Tùng'],
      publisher: 'NXB Thông tin và Truyền thông',
      publishYear: 2022,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049543951'),
      description: 'Hướng dẫn xây dựng các mô hình học máy (Machine Learning) với thư viện scikit-learn và TensorFlow. Bao gồm hồi quy, phân loại, mạng nơ-ron và các bài toán thực tế.',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '9786049542718',
      title: 'Lập trình Web với JavaScript và Node.js',
      authorNames: ['Phạm Hữu Khang'],
      publisher: 'NXB Thông tin và Truyền thông',
      publishYear: 2021,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049542718'),
      description: 'Xây dựng ứng dụng web hiện đại với JavaScript phía client và Node.js phía server. Hướng dẫn thực hành từ HTML/CSS đến REST API, cơ sở dữ liệu và triển khai ứng dụng.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786040230805',
      title: 'Cơ sở Dữ liệu: Lý thuyết và Thực hành',
      authorNames: ['Nguyễn Văn Oanh'],
      publisher: 'NXB Đại học Quốc gia TP.HCM',
      publishYear: 2019,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786040230805'),
      description: 'Giáo trình cơ sở dữ liệu toàn diện: mô hình quan hệ, SQL, thiết kế cơ sở dữ liệu chuẩn hóa, xử lý giao dịch, tối ưu hóa truy vấn và hệ quản trị CSDL phổ biến.',
      totalCopies: 9,
      availableCopies: 9,
    },
    {
      isbn: '9786049539947',
      title: 'Trí tuệ Nhân tạo: Nhập môn',
      authorNames: ['Phan Thị Tươi'],
      publisher: 'NXB Đại học Quốc gia TP.HCM',
      publishYear: 2020,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049539947'),
      description: 'Giới thiệu các khái niệm nền tảng của trí tuệ nhân tạo: tìm kiếm, logic, học máy, xử lý ngôn ngữ tự nhiên và thị giác máy tính. Phù hợp cho sinh viên CNTT năm 3-4.',
      totalCopies: 8,
      availableCopies: 7,
    },
    {
      isbn: '9786049541421',
      title: 'An toàn và Bảo mật Thông tin',
      authorNames: ['Nguyễn Khanh Văn'],
      publisher: 'NXB Thông tin và Truyền thông',
      publishYear: 2022,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049541421'),
      description: 'Kiến thức toàn diện về an toàn mạng, mã hóa, xác thực, tường lửa và phòng chống tấn công mạng. Bao gồm các tiêu chuẩn bảo mật quốc tế và case study thực tế.',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '9786040257512',
      title: 'Mạng Máy Tính',
      authorNames: ['Nguyễn Gia Hiểu'],
      publisher: 'NXB Khoa học và Kỹ thuật',
      publishYear: 2021,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786040257512'),
      description: 'Tài liệu nền tảng về mạng máy tính: mô hình OSI, giao thức TCP/IP, định tuyến, chuyển mạch, mạng không dây và các công nghệ mạng hiện đại như SDN và Cloud Networking.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786040193728',
      title: 'Phát triển Ứng dụng Mobile với React Native',
      authorNames: ['Võ Tấn Dũng', 'Huỳnh Minh Trí'],
      publisher: 'NXB Đại học Quốc gia TP.HCM',
      publishYear: 2023,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786040193728'),
      description: 'Hướng dẫn xây dựng ứng dụng di động đa nền tảng (iOS và Android) với React Native và Expo. Từ thiết kế giao diện đến tích hợp API, quản lý state và xuất bản ứng dụng.',
      totalCopies: 5,
      availableCopies: 5,
    },
    {
      isbn: '9786049540516',
      title: 'Kiến trúc Phần mềm: Từ Nguyên lý đến Thực hành',
      authorNames: ['Lê Văn Cảnh'],
      publisher: 'NXB Đại học Quốc gia Hà Nội',
      publishYear: 2022,
      language: 'vi',
      categoryId: catCS.id,
      coverImageUrl: VN('9786049540516'),
      description: 'Kiến trúc phần mềm hiện đại: monolith, microservices, event-driven, clean architecture, SOLID principles và các mẫu thiết kế kiến trúc. Minh họa qua các dự án thực tế.',
      totalCopies: 6,
      availableCopies: 5,
    },

    // ── Kinh tế - Quản trị (Tiếng Việt) ───────────────────────
    {
      isbn: '9786041068568',
      title: 'Quản trị Doanh nghiệp',
      authorNames: ['Nguyễn Thị Liên Diệp', 'Phạm Văn Nam'],
      publisher: 'NXB Lao động - Xã hội',
      publishYear: 2020,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041068568'),
      description: 'Giáo trình quản trị doanh nghiệp toàn diện: lập kế hoạch, tổ chức, lãnh đạo và kiểm soát. Phân tích môi trường kinh doanh, chiến lược cạnh tranh và quản lý nguồn nhân lực.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786041069282',
      title: 'Marketing Căn bản',
      authorNames: ['Trần Minh Đạo'],
      publisher: 'NXB Đại học Kinh tế Quốc dân',
      publishYear: 2021,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041069282'),
      description: 'Kiến thức marketing hiện đại: nghiên cứu thị trường, phân khúc và định vị thương hiệu, marketing mix 4P, marketing kỹ thuật số và quản lý quan hệ khách hàng (CRM).',
      totalCopies: 9,
      availableCopies: 9,
    },
    {
      isbn: '9786040253897',
      title: 'Tài chính Doanh nghiệp',
      authorNames: ['Nguyễn Minh Kiều'],
      publisher: 'NXB Tài chính',
      publishYear: 2022,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786040253897'),
      description: 'Phân tích tài chính doanh nghiệp: báo cáo tài chính, quản lý vốn lưu động, đầu tư, cấu trúc vốn và định giá doanh nghiệp. Kết hợp lý thuyết và ứng dụng thực tế.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786041067998',
      title: 'Kinh tế Vi mô',
      authorNames: ['Vũ Kim Dũng'],
      publisher: 'NXB Đại học Kinh tế Quốc dân',
      publishYear: 2020,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041067998'),
      description: 'Giáo trình kinh tế vi mô chuẩn: cung cầu, lý thuyết tiêu dùng, lý thuyết hãng, cạnh tranh hoàn hảo và không hoàn hảo, ngoại ứng và hàng hóa công cộng.',
      totalCopies: 10,
      availableCopies: 10,
    },
    {
      isbn: '9786041068131',
      title: 'Kinh tế Vĩ mô',
      authorNames: ['Nguyễn Văn Công'],
      publisher: 'NXB Đại học Kinh tế Quốc dân',
      publishYear: 2020,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041068131'),
      description: 'Giáo trình kinh tế vĩ mô: tổng sản phẩm quốc nội, lạm phát, thất nghiệp, chính sách tài khóa và tiền tệ, thương mại quốc tế và tỷ giá hối đoái.',
      totalCopies: 10,
      availableCopies: 9,
    },
    {
      isbn: '9786041068582',
      title: 'Quản trị Dự án',
      authorNames: ['Lê Thị Mỹ Linh'],
      publisher: 'NXB Khoa học và Kỹ thuật',
      publishYear: 2021,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041068582'),
      description: 'Phương pháp quản lý dự án hiện đại: PMP, Agile, Scrum và Kanban. Lập kế hoạch, quản lý phạm vi, thời gian, chi phí, chất lượng và rủi ro trong môi trường dự án thực tế.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786041079830',
      title: 'Khởi nghiệp Tinh gọn',
      authorNames: ['Eric Ries', 'Dịch giả: Ngô Hà Vy'],
      publisher: 'NXB Trẻ',
      publishYear: 2019,
      language: 'vi',
      categoryId: catEcon.id,
      coverImageUrl: VN('9786041079830'),
      description: 'Phương pháp xây dựng startup thông qua vòng lặp xây dựng-đo lường-học hỏi. Học cách phát triển sản phẩm khả thi tối thiểu (MVP) và kiểm định giả thuyết kinh doanh nhanh chóng.',
      totalCopies: 6,
      availableCopies: 6,
    },

    // ── Tâm lý - Kỹ năng sống (Tiếng Việt) ───────────────────
    {
      isbn: '9786041089365',
      title: 'Đắc Nhân Tâm',
      authorNames: ['Dale Carnegie', 'Dịch giả: Nguyễn Thị Thu Hà'],
      publisher: 'NXB Tổng hợp TP.HCM',
      publishYear: 2022,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041089365'),
      description: 'Cuốn sách kỹ năng giao tiếp và xây dựng mối quan hệ kinh điển nhất mọi thời đại. Hướng dẫn cách gây thiện cảm, thuyết phục người khác và trở thành nhà lãnh đạo được yêu mến.',
      totalCopies: 12,
      availableCopies: 10,
    },
    {
      isbn: '9786041027602',
      title: 'Nghĩ Giàu Làm Giàu',
      authorNames: ['Napoleon Hill', 'Dịch giả: Trần Trọng Hải'],
      publisher: 'NXB Tổng hợp TP.HCM',
      publishYear: 2021,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041027602'),
      description: 'Phân tích bí quyết thành công của 500 người giàu nhất nước Mỹ. Trình bày 13 nguyên tắc tư duy để đạt được sự giàu có về vật chất lẫn tinh thần.',
      totalCopies: 10,
      availableCopies: 9,
    },
    {
      isbn: '9786041085510',
      title: 'Người Quảng cáo Vĩ đại nhất Thế giới',
      authorNames: ['Og Mandino', 'Dịch giả: Vũ Thị Thúy Liễu'],
      publisher: 'NXB Tổng hợp TP.HCM',
      publishYear: 2020,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041085510'),
      description: 'Tiểu thuyết truyền cảm hứng về hành trình từ người bán hàng thất bại trở thành nhà quảng cáo vĩ đại nhất thế giới thông qua 10 cuộn giấy cổ xưa.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786041096585',
      title: 'Sức mạnh của Thói quen',
      authorNames: ['Charles Duhigg', 'Dịch giả: Lê Đình Chi'],
      publisher: 'NXB Lao động',
      publishYear: 2022,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041096585'),
      description: 'Khoa học đằng sau thói quen của cá nhân, doanh nghiệp và xã hội. Giải thích vòng lặp thói quen và cách thay đổi thói quen để cải thiện cuộc sống và công việc.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786041091078',
      title: 'Tâm lý học Đám đông',
      authorNames: ['Gustave Le Bon', 'Dịch giả: Nguyễn Xuân Khánh'],
      publisher: 'NXB Tri Thức',
      publishYear: 2019,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041091078'),
      description: 'Tác phẩm kinh điển phân tích tâm lý và hành vi của đám đông. Giải thích tại sao con người trong tập thể lại hành xử khác biệt và cách lãnh đạo ảnh hưởng đến quần chúng.',
      totalCopies: 6,
      availableCopies: 6,
    },
    {
      isbn: '9786041026292',
      title: 'Kỹ năng Thuyết trình Hiệu quả',
      authorNames: ['Chu Văn Đức'],
      publisher: 'NXB Lao động - Xã hội',
      publishYear: 2020,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041026292'),
      description: 'Phát triển kỹ năng thuyết trình chuyên nghiệp: cấu trúc bài nói, ngôn ngữ cơ thể, sử dụng slide hiệu quả và xử lý câu hỏi. Phù hợp cho sinh viên và người đi làm.',
      totalCopies: 7,
      availableCopies: 7,
    },

    // ── Văn học Việt Nam ────────────────────────────────────────
    {
      isbn: '9786041076235',
      title: 'Số Đỏ',
      authorNames: ['Vũ Trọng Phụng'],
      publisher: 'NXB Văn học',
      publishYear: 2018,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041076235'),
      description: 'Tiểu thuyết phê phán xã hội thực dân phong kiến Việt Nam đầu thế kỷ 20. Câu chuyện về Xuân Tóc Đỏ - từ kẻ bần cùng trở thành "người hùng" của xã hội thượng lưu giả dối.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786041081246',
      title: 'Chí Phèo và Lão Hạc',
      authorNames: ['Nam Cao'],
      publisher: 'NXB Văn học',
      publishYear: 2019,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041081246'),
      description: 'Tuyển tập hai truyện ngắn kiệt tác của Nam Cao: Chí Phèo phản ánh bi kịch tha hóa của người nông dân, Lão Hạc ca ngợi phẩm giá và tình phụ tử trong nghèo khó.',
      totalCopies: 9,
      availableCopies: 9,
    },
    {
      isbn: '9786041048546',
      title: 'Đất Rừng Phương Nam',
      authorNames: ['Đoàn Giỏi'],
      publisher: 'NXB Văn học',
      publishYear: 2020,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041048546'),
      description: 'Tiểu thuyết phiêu lưu về cậu bé An và hành trình khám phá vùng đất Nam Bộ hoang sơ, hùng vĩ. Bức tranh sinh động về thiên nhiên, con người và cuộc kháng chiến ở miền Nam.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786041067028',
      title: 'Tắt Đèn',
      authorNames: ['Ngô Tất Tố'],
      publisher: 'NXB Văn học',
      publishYear: 2018,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041067028'),
      description: 'Tiểu thuyết tố cáo xã hội phong kiến và chế độ thuế đinh thực dân qua câu chuyện chị Dậu - người phụ nữ nông dân kiên cường trong hoàn cảnh cùng cực.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786041078482',
      title: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ',
      authorNames: ['Nguyễn Nhật Ánh'],
      publisher: 'NXB Trẻ',
      publishYear: 2021,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041078482'),
      description: 'Tác phẩm nổi tiếng của Nguyễn Nhật Ánh về tuổi thơ trong sáng và những ký ức đẹp của trẻ em Việt Nam. Cuốn sách được dịch ra nhiều thứ tiếng và được yêu thích khắp nơi.',
      totalCopies: 10,
      availableCopies: 9,
    },
    {
      isbn: '9786041079878',
      title: 'Mắt Biếc',
      authorNames: ['Nguyễn Nhật Ánh'],
      publisher: 'NXB Trẻ',
      publishYear: 2020,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041079878'),
      description: 'Câu chuyện tình yêu trong sáng, đau buồn và đẹp đẽ giữa Ngạn và Hà Lan. Tác phẩm được chuyển thể thành phim điện ảnh thành công, ghi dấu ấn sâu sắc trong lòng độc giả.',
      totalCopies: 10,
      availableCopies: 10,
    },
    {
      isbn: '9786041088771',
      title: 'Nhà Giả Kim (Bìa Cứng)',
      authorNames: ['Paulo Coelho', 'Dịch giả: Lê Chu Cầu'],
      publisher: 'NXB Hội Nhà văn',
      publishYear: 2022,
      language: 'vi',
      categoryId: catLit.id,
      coverImageUrl: VN('9786041088771'),
      description: 'Hành trình của Santiago - chàng chăn cừu người Tây Ban Nha đi tìm kho báu ở Ai Cập. Tiểu thuyết triết học về việc theo đuổi ước mơ, lắng nghe trái tim và ý nghĩa của cuộc sống.',
      totalCopies: 8,
      availableCopies: 7,
    },

    // ── Lịch sử - Văn hóa Việt Nam ─────────────────────────────
    {
      isbn: '9786040228949',
      title: 'Lịch sử Việt Nam Từ Nguồn Gốc đến Thế kỷ XIX',
      authorNames: ['Lê Thành Khôi'],
      publisher: 'NXB Thế Giới',
      publishYear: 2019,
      language: 'vi',
      categoryId: catPhilosophy.id,
      coverImageUrl: VN('9786040228949'),
      description: 'Toàn cảnh lịch sử Việt Nam từ thời kỳ dựng nước đến trước cuộc xâm lăng của người Pháp. Phân tích sâu sắc văn hóa, xã hội, chính trị và đối ngoại của các triều đại Việt Nam.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786040254818',
      title: 'Đại Cương Lịch sử Việt Nam',
      authorNames: ['Trương Hữu Quýnh', 'Đinh Xuân Lâm', 'Lê Mậu Hãn'],
      publisher: 'NXB Giáo dục',
      publishYear: 2018,
      language: 'vi',
      categoryId: catPhilosophy.id,
      coverImageUrl: VN('9786040254818'),
      description: 'Giáo trình lịch sử Việt Nam chuẩn dùng trong các trường đại học: thời tiền sử, các triều đại phong kiến, giai đoạn thuộc địa, kháng chiến và công cuộc đổi mới.',
      totalCopies: 10,
      availableCopies: 10,
    },
    {
      isbn: '9786040261359',
      title: 'Văn hóa Việt Nam nhìn từ Bản sắc Dân tộc',
      authorNames: ['Trần Quốc Vượng'],
      publisher: 'NXB Văn hóa - Thông tin',
      publishYear: 2020,
      language: 'vi',
      categoryId: catPhilosophy.id,
      coverImageUrl: VN('9786040261359'),
      description: 'Nghiên cứu chiều sâu văn hóa và bản sắc dân tộc Việt Nam qua ngàn năm lịch sử. Phân tích phong tục tập quán, tín ngưỡng, nghệ thuật và triết lý sống của người Việt.',
      totalCopies: 6,
      availableCopies: 6,
    },

    // ── Khoa học - Tự nhiên (Tiếng Việt) ──────────────────────
    {
      isbn: '9786040237156',
      title: 'Giải tích 1',
      authorNames: ['Nguyễn Đình Trí', 'Tạ Văn Đĩnh', 'Nguyễn Hồ Quỳnh'],
      publisher: 'NXB Giáo dục',
      publishYear: 2021,
      language: 'vi',
      categoryId: catSci.id,
      coverImageUrl: VN('9786040237156'),
      description: 'Giáo trình giải tích một biến số chuẩn dành cho sinh viên kỹ thuật năm nhất. Bao gồm giới hạn, đạo hàm, tích phân và ứng dụng trong vật lý kỹ thuật.',
      totalCopies: 12,
      availableCopies: 12,
    },
    {
      isbn: '9786040237163',
      title: 'Giải tích 2',
      authorNames: ['Nguyễn Đình Trí', 'Tạ Văn Đĩnh', 'Nguyễn Hồ Quỳnh'],
      publisher: 'NXB Giáo dục',
      publishYear: 2021,
      language: 'vi',
      categoryId: catSci.id,
      coverImageUrl: VN('9786040237163'),
      description: 'Giáo trình giải tích nhiều biến số và phương trình vi phân. Bao gồm chuỗi số, tích phân bội, tích phân đường và mặt, phương trình vi phân thường và ứng dụng.',
      totalCopies: 12,
      availableCopies: 11,
    },
    {
      isbn: '9786040241856',
      title: 'Đại số Tuyến tính',
      authorNames: ['Trần Đức Long', 'Nguyễn Đình Sang'],
      publisher: 'NXB Giáo dục',
      publishYear: 2020,
      language: 'vi',
      categoryId: catSci.id,
      coverImageUrl: VN('9786040241856'),
      description: 'Giáo trình đại số tuyến tính đầy đủ: hệ phương trình tuyến tính, ma trận, định thức, không gian vector và ánh xạ tuyến tính. Có nhiều bài tập thực hành.',
      totalCopies: 12,
      availableCopies: 12,
    },
    {
      isbn: '9786040233912',
      title: 'Vật lý Đại cương',
      authorNames: ['Lương Duyên Bình'],
      publisher: 'NXB Giáo dục',
      publishYear: 2019,
      language: 'vi',
      categoryId: catSci.id,
      coverImageUrl: VN('9786040233912'),
      description: 'Giáo trình vật lý đại cương dành cho sinh viên kỹ thuật: cơ học, nhiệt học, điện từ học, quang học và vật lý hiện đại. Bao gồm lý thuyết và bài tập vận dụng.',
      totalCopies: 10,
      availableCopies: 10,
    },
    {
      isbn: '9786040278432',
      title: 'Xác suất Thống kê',
      authorNames: ['Tống Đình Quỳ'],
      publisher: 'NXB Khoa học và Kỹ thuật',
      publishYear: 2021,
      language: 'vi',
      categoryId: catSci.id,
      coverImageUrl: VN('9786040278432'),
      description: 'Giáo trình xác suất thống kê ứng dụng: biến ngẫu nhiên, phân phối xác suất, kiểm định giả thuyết, hồi quy tuyến tính. Ứng dụng trong kỹ thuật và khoa học máy tính.',
      totalCopies: 10,
      availableCopies: 10,
    },

    // ── Kỹ thuật & Kỹ năng mềm bổ sung ────────────────────────
    {
      isbn: '9786041096059',
      title: 'Tư duy Phản biện',
      authorNames: ['Richard Paul', 'Linda Elder', 'Dịch giả: Ngô Bích Thuỷ'],
      publisher: 'NXB Lao động',
      publishYear: 2021,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041096059'),
      description: 'Rèn luyện tư duy phản biện và phân tích logic: nhận biết lập luận sai, tránh thiên kiến nhận thức, đặt câu hỏi đúng và đưa ra quyết định dựa trên bằng chứng.',
      totalCopies: 7,
      availableCopies: 7,
    },
    {
      isbn: '9786041098053',
      title: 'Nghệ thuật Học và Ghi nhớ Nhanh',
      authorNames: ['Tony Buzan', 'Dịch giả: Trần Thị Thu Hương'],
      publisher: 'NXB Tổng hợp TP.HCM',
      publishYear: 2022,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041098053'),
      description: 'Phương pháp học tập hiệu quả của Tony Buzan: mind mapping, ghi nhớ nhanh, tư duy sáng tạo và tối ưu hóa bộ nhớ. Áp dụng cho học sinh, sinh viên và người đi làm.',
      totalCopies: 8,
      availableCopies: 8,
    },
    {
      isbn: '9786041075689',
      title: 'Lãnh đạo bằng Cảm xúc (EQ)',
      authorNames: ['Daniel Goleman', 'Dịch giả: Thu Thuỷ'],
      publisher: 'NXB Lao động',
      publishYear: 2020,
      language: 'vi',
      categoryId: catPsych.id,
      coverImageUrl: VN('9786041075689'),
      description: 'Trí tuệ cảm xúc (EQ) trong lãnh đạo và quản lý tổ chức. Phân tích 6 phong cách lãnh đạo và cách phát triển EQ để tạo ra môi trường làm việc tích cực và hiệu quả.',
      totalCopies: 6,
      availableCopies: 6,
    },
  ];


  // Upsert all books
  const createdBooks: { id: string; isbn: string | null; title: string; totalCopies: number }[] = [];
  for (const bookData of booksData) {
    const book = await prisma.book.upsert({
      where: { isbn: bookData.isbn },
      update: {
        coverImageUrl: bookData.coverImageUrl,
        description: bookData.description,
        availableCopies: bookData.availableCopies,
        totalCopies: bookData.totalCopies,
      },
      create: {
        ...bookData,
        createdById: librarian.id,
      },
    });
    createdBooks.push(book);
  }

  console.log(`✅ ${createdBooks.length} books seeded`);

  // ─── Physical Copies ──────────────────────────────────────
  // Create physical copies for each book if not exists
  let totalCopiesCreated = 0;
  for (const book of createdBooks) {
    const existingCount = await prisma.physicalCopy.count({ where: { bookId: book.id } });
    if (existingCount > 0) continue;

    const total = book.totalCopies;
    const prefix = book.isbn?.replace(/[^0-9]/g, '').slice(-4) ?? book.id.slice(-4);
    const shelf = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][Math.floor(Math.random() * 7)];

    for (let i = 1; i <= total; i++) {
      await prisma.physicalCopy.create({
        data: {
          bookId: book.id,
          // First 60% of copies go to branch1, rest to branch2
          branchId: i <= Math.ceil(total * 0.6) ? branch1.id : branch2.id,
          barcode: `BK-${prefix}-${String(i).padStart(4, '0')}`,
          location: `Kệ ${shelf}${Math.ceil(i / 2)}`,
          condition: i <= Math.floor(total * 0.8) ? 'GOOD' : 'FAIR',
        },
      });
      totalCopiesCreated++;
    }
  }

  console.log(`✅ ${totalCopiesCreated} physical copies created`);
  console.log('✅ Books and physical copies seeded');

// ─── Tài nguyên số — gắn nhiều sách với nội dung phù hợp định dạng ─────────
console.log('🌱 Seeding digital resources...');

// Dọn toàn bộ tài nguyên số cũ để phân loại lại sạch
const oldDigital = await prisma.digitalResource.findMany({
  where: { id: { startsWith: 'res-digital-' } },
  select: { id: true },
});
if (oldDigital.length > 0) {
  await prisma.digitalAccessLog.deleteMany({
    where: { digitalResourceId: { in: oldDigital.map((r) => r.id) } },
  });
  await prisma.digitalResource.deleteMany({
    where: { id: { in: oldDigital.map((r) => r.id) } },
  });
}
await prisma.digitalAccessLog.deleteMany({
  where: { digitalResourceId: { in: ['res-ebook-pdf', 'res-audio-001', 'res-journal-001'] } },
});
await prisma.digitalResource.deleteMany({
  where: { id: { in: ['res-ebook-pdf', 'res-audio-001', 'res-journal-001'] } },
});

/** Phân loại: PDF/EPUB = đọc | AUDIOBOOK = nghe | VIDEO = xem bài giảng */
const digitalPlan: Array<{ match: string; type: 'PDF' | 'EPUB' | 'AUDIOBOOK' | 'VIDEO'; exact?: boolean }> = [
  // E-book PDF — giáo trình, kỹ thuật, tham khảo
  { match: 'Clean Code', type: 'PDF' },
  { match: 'Design Patterns', type: 'PDF' },
  { match: 'Introduction to Algorithms', type: 'PDF' },
  { match: 'JavaScript: The Good Parts', type: 'PDF' },
  { match: 'Giải tích 1', type: 'PDF', exact: true },
  { match: 'Giải tích 2', type: 'PDF', exact: true },
  { match: 'Nghệ thuật Học', type: 'PDF' },
  { match: 'Lập trình Python cơ bản', type: 'PDF' },
  { match: 'Cơ sở Dữ liệu', type: 'PDF' },
  { match: 'The Pragmatic Programmer', type: 'PDF' },

  // E-book EPUB — nhân văn, văn học, khoa học xã hội
  { match: 'Đại số Tuyến tính', type: 'EPUB', exact: true },
  { match: 'Vật lý Đại cương', type: 'EPUB', exact: true },
  { match: 'Văn hóa Việt Nam', type: 'EPUB' },
  { match: 'Lãnh đạo bằng Cảm xúc', type: 'EPUB' },
  { match: 'Số Đỏ', type: 'EPUB', exact: true },
  { match: 'Lịch sử Việt Nam Từ Nguồn Gốc', type: 'EPUB' },
  { match: 'Learning Python', type: 'EPUB' },

  // Audiobook — văn học, phát triển bản thân (nghe)
  { match: 'Nhà Giả Kim', type: 'AUDIOBOOK', exact: true },
  { match: 'Sapiens', type: 'AUDIOBOOK' },
  { match: 'Atomic Habits', type: 'AUDIOBOOK' },
  { match: 'Great Expectations', type: 'AUDIOBOOK' },
  { match: 'Thinking, Fast and Slow', type: 'AUDIOBOOK' },
  { match: "Man's Search for Meaning", type: 'AUDIOBOOK' },
  { match: 'Cho Tôi Xin Một Vé Đi Tuổi Thơ', type: 'AUDIOBOOK' },
  { match: 'Homo Deus', type: 'AUDIOBOOK' },
  { match: 'Đắc Nhân Tâm', type: 'AUDIOBOOK' },

  // Video — bài giảng, khóa học (xem)
  { match: 'Học máy với Python', type: 'VIDEO' },
  { match: 'Trí tuệ Nhân tạo', type: 'VIDEO' },
  { match: 'Hands-On Machine Learning', type: 'VIDEO' },
  { match: 'Xác suất Thống kê', type: 'VIDEO', exact: true },
  { match: 'Tư duy Phản biện', type: 'VIDEO', exact: true },
  { match: 'Mạng Máy Tính', type: 'VIDEO' },
];

let digitalCount = 0;

for (const plan of digitalPlan) {
  const book = plan.exact
    ? await prisma.book.findFirst({
        where: { title: { equals: plan.match, mode: 'insensitive' } },
      })
    : (await prisma.book.findFirst({
        where: { title: { equals: plan.match, mode: 'insensitive' } },
      })) ||
      (await prisma.book.findFirst({
        where: { title: { contains: plan.match, mode: 'insensitive' } },
        orderBy: { title: 'asc' },
      }));
  if (!book) continue;

  const contentUrl = resolveDigitalContentUrl(book.title, plan.type, 'https://archive.org/embed/gutenberg');
  let fileUrl = contentUrl;
  if (plan.type === 'AUDIOBOOK' || plan.type === 'VIDEO') {
    const direct = resolveDirectStreamUrl(book.title, plan.type);
    if (direct) fileUrl = direct;
  }

  const resourceId = `res-digital-${digitalCount.toString().padStart(3, '0')}`;
  await prisma.digitalResource.upsert({
    where: { id: resourceId },
    update: { fileUrl, resourceType: plan.type, bookId: book.id, maxConcurrentUsers: 10 },
    create: {
      id: resourceId,
      bookId: book.id,
      resourceType: plan.type,
      fileUrl,
      maxConcurrentUsers: 10,
    },
  });
  digitalCount++;
  console.log(`✅ Digital [${plan.type}]: "${book.title}"`);
}

console.log(`✅ ${digitalCount} digital resources seeded`);

// Dọn dữ liệu mượn trả giả cũ (nếu còn từ lần seed trước) — lịch sử thật chỉ từ thủ thư
const readerForCleanup = await prisma.user.findFirst({ where: { email: 'reader1@student.edu.vn' } });
if (readerForCleanup) {
  await prisma.fine.deleteMany({ where: { userId: readerForCleanup.id } });
  const deletedBorrows = await prisma.borrowRecord.deleteMany({ where: { userId: readerForCleanup.id } });
  await prisma.reservation.deleteMany({ where: { userId: readerForCleanup.id } });
  if (deletedBorrows.count > 0) {
    console.log(`🧹 Removed ${deletedBorrows.count} seeded borrow records for reader1 (use librarian circulation for real data)`);
  }
}

console.log('ℹ️  Borrow/return history is created only via librarian circulation (no fake seed).');
  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────────');
  console.log('Login credentials:');
  console.log('  Admin:     admin@library.edu.vn     / Admin@123456');
  console.log('  Librarian: librarian@library.edu.vn / Librarian@123');
  console.log('  Reader 1:  reader1@student.edu.vn   / Reader@123');
  console.log('  Reader 2:  reader2@student.edu.vn   / Reader@123');
  console.log('  Librarian Nguyễn Anh Khoa: anhkhoaoki@gmail.com / 12345678');
  console.log('  Reader Nguyễn Anh Khoa:    anhkhoaoki789@gmail.com / 12345678');
  console.log('─────────────────────────────────────');
  console.log(`📚 Total books: ${createdBooks.length}`);
  console.log(`📦 Total physical copies: ${totalCopiesCreated}`);
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
