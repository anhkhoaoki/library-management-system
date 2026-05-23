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
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Open Library Covers API: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
const OL = (isbn: string) => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

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
      role: Role.READER,
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
      fullName: 'Nguyễn Anh Khoa (Thủ thư)',
      phone: '0912345679',
      role: Role.LIBRARIAN,
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
