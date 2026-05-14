import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';

export default function BorrowedBooksPage() {
  const navigate = useNavigate();
  const [books] = useState([
    {
      id: 1,
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      code: 'DT-402',
      borrowDate: '10/10/2023',
      dueDate: '24/10/2023',
      renewalCount: 0,
      renewalMax: 3,
      status: 'normal',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBlByUy7KX5uMD5BH6nOzgd7JDHcA5LuJgkkT3sJo3wrxHXACLhtZ5ijIksJNIycS1okhslXaO7sHrTd9pXInokCmFu_i8lVacIWl8PFmjVeP0LYwx8M2KsBR1CFhJh9VNKeSbPETEcbSC8yhiBFLqcwy6pViwuUkHlsDd1Orb1Wz1rm_iDJ7StvwTLPxcAZJb9avGjEJeSX-ttjLWkRyTNMoAFKJk-3jc18954toyqoquXxc75iE0HEJDE7T7lmhJfJCIhNn4K_xls',
    },
    {
      id: 2,
      title: 'Artificial Intelligence: A Modern Approach',
      author: 'Stuart Russell, Peter Norvig',
      code: 'CS-891',
      borrowDate: '01/10/2023',
      dueDate: '16/10/2023',
      renewalCount: 1,
      renewalMax: 3,
      status: 'warning',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAq4tP3AmL6wGXztdeaZHh_HUOpW-jjtB603MQaMiQ2zahyCpn0HHRvYywvALyzSSnsFWIZp_AhMHfLNhYqepTO3NAG_vLtCTkSxkJ9OWTjE167QvMjMYzSLgXurXFk9HggmWp53D9OBC2pDD6AWUEVtPav9J-O_dOcpMW2A0_kKqAD79NkMoAZKNT5K8a_b_HHqU9vyoL7uQ6nAI-bfQFha9F5KE-KydCzUeIcha-AgEKiWz6_ymMNmIb_E4mU9o6-rJk6RpdJFGWc',
    },
    {
      id: 3,
      title: 'Dune',
      author: 'Frank Herbert',
      code: 'SF-112',
      borrowDate: '25/09/2023',
      dueDate: '20/10/2023',
      renewalCount: 0,
      renewalMax: 3,
      status: 'reserved',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPYICEtbj34CZIVxe0EUPBYHSclRWdIE9wLVLsnbZH60OrZP0lQOA9STKBIi7zznGk-ZjUm7oWiwI9l_XiJNVZ5VLpyK7KLX-1CDjdvT5bK6ynsHyIsOvuLOGP0zRyZAk0yQEu_c1HPj9B5VRysfrzSbmJ3CXkt4gJ_ZJbtHZGHI35Zk2bYYov8vKViQdUzvdKKMzfQr9ZtKVFz-plJJvvoTHLJn2diASFo_YgCpJc5CiTrqo10NcwNvnZV0ydE2eWwZ6Rknq07FIz',
    },
  ]);

  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="max-w-container-max mx-auto space-y-stack-lg">
        {/* Page Header */}
        <div>
          <h2 className="font-headline-lg text-headline-lg md:font-headline-lg md:text-headline-lg text-on-surface mb-stack-sm">
            Sách Đang Mượn
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Quản lý và gia hạn các tài liệu bạn đang lưu giữ.
          </p>
        </div>

        {/* Summary Bento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary">book_4</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Tổng đang mượn</span>
            </div>
            <span className="font-display-lg text-display-lg text-primary">03</span>
          </div>
          <div
            className="bg-[#f0f9ff] p-stack-md rounded-xl shadow-sm border border-[#bae6fd] flex flex-col justify-between relative overflow-hidden"
            style={{ boxShadow: '0 0 15px rgba(13, 148, 136, 0.3)' }}
          >
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <span className="material-symbols-outlined text-5xl">auto_awesome</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-secondary">schedule</span>
              <span className="font-label-md text-label-md text-on-secondary-container">Sắp đến hạn</span>
            </div>
            <div className="flex items-end justify-between">
              <span className="font-display-lg text-display-lg text-secondary">01</span>
              <span className="font-label-sm text-label-sm text-secondary-container bg-on-secondary-container px-2 py-1 rounded-full">
                Cần lưu ý
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-stack-md rounded-xl shadow-sm border border-surface-container flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-error">warning</span>
              <span className="font-label-md text-label-md text-on-surface-variant">Quá hạn</span>
            </div>
            <span className="font-display-lg text-display-lg text-on-surface-variant">00</span>
          </div>
        </div>

        {/* List of Borrowed Books */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-stack-md">
          {books.map((book) => (
            <article
              key={book.id}
              className={`bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border p-stack-md flex flex-col sm:flex-row gap-stack-md relative ${
                book.status === 'warning' ? 'border-secondary-container' : 'border-surface-container'
              }`}
            >
              {book.status === 'warning' && (
                <div className="absolute left-0 top-0 w-1 h-full bg-secondary"></div>
              )}

              <div className="w-full sm:w-32 h-48 flex-shrink-0 bg-surface-container rounded-lg overflow-hidden border border-outline-variant">
                <img alt="Book cover" className="w-full h-full object-cover" src={book.image} />
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-title-lg text-title-lg text-on-surface line-clamp-2">{book.title}</h3>
                    <span className="bg-surface-container-low text-primary font-label-sm text-label-sm px-2 py-1 rounded-md border border-outline-variant flex-shrink-0">
                      Mã: {book.code}
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4">{book.author}</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-label-md text-label-md">
                      <span className="text-outline">Ngày mượn:</span>
                      <span className="text-on-surface">{book.borrowDate}</span>
                    </div>
                    <div
                      className={`flex items-center justify-between font-label-md text-label-md ${
                        book.status === 'warning'
                          ? 'bg-secondary-fixed-dim/20 px-2 py-1 -mx-2 rounded'
                          : ''
                      }`}
                    >
                      <span className={book.status === 'warning' ? 'text-on-secondary-fixed-variant' : 'text-outline'}>
                        Hạn trả:
                      </span>
                      <span
                        className={`${
                          book.status === 'warning'
                            ? 'text-on-secondary-fixed-variant font-bold flex items-center gap-1'
                            : 'text-on-surface font-semibold'
                        }`}
                      >
                        {book.status === 'warning' && (
                          <span className="material-symbols-outlined text-[16px]">timer</span>
                        )}
                        {book.dueDate}
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm mt-2">
                      <span className="text-outline">Số lần gia hạn:</span>
                      <span className="text-on-surface-variant">
                        {book.renewalCount}/{book.renewalMax}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {book.status === 'reserved' ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 text-error font-label-sm text-label-sm bg-error-container/50 px-2 py-1 rounded w-fit">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        Không thể gia hạn: Đã có độc giả khác đặt trước
                      </div>
                      <button
                        disabled
                        className="bg-surface-variant text-on-surface-variant opacity-60 cursor-not-allowed font-label-md text-label-md px-6 py-2 rounded-lg flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        Gia hạn
                      </button>
                    </div>
                  ) : (
                    <button className="bg-primary hover:bg-primary-container hover:text-on-primary-container text-on-primary font-label-md text-label-md px-6 py-2 rounded-lg transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">update</span>
                      Gia hạn
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
