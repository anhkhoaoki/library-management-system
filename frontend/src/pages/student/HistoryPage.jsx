import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function HistoryPage() {
  const [history] = useState([
    {
      id: 1,
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      borrowDate: '10/10/2023',
      returnDate: '24/10/2023',
      status: 'ontime',
      fine: '-',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDrgY2SL8hQS5hwl2EKN_mqGKo3Qhp3tntENjvIYwHflJkHu1J8eXFMqt7xcLhiQhijBQivSxeEyZnTQI5PKIjqORGR0z7MjDHH1Y3Oun42IaL2VU4LgaFkRvczG2kpDpa0Tnnj1Begbk4oHByl0Si7jDVsDDJ867-qABbv8CKEtZSUsmYpUusg5uKz3Ow3xHtJWL96BlPW95XNHdq08ObCbWpVixSJSPD50gwYKOrP3kw20rs6kgEAc9CREjZJk-thW8Xn1IeYNgBu',
    },
    {
      id: 2,
      title: 'Sapiens: A Brief History of Humankind',
      author: 'Yuval Noah Harari',
      borrowDate: '01/09/2023',
      returnDate: '20/09/2023',
      status: 'late',
      fine: '50,000đ',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmd-iDnv5OSULFS6Dqdqiea6adhsC74_HXjV6Hgs1cojItKrGzBYlI_rQ1vC3o5vNf9Yyd9_5q6_5hxU7SP_bjPbm_0OKompd3WDfvh2U3dQ9HHG2P8ivtUOhZq3D2FHMSTe0n1Lp1Woko1pawDvPdUkGerwrML4lcSNC07WqO4c1vc8-uQ8UZgCVdqvHuK32fReEPCk80wabB2WKgWCH8fxVRyJGunYCKO8CTT5yDtmuIG_ojsK_2L1dwaAWCr-rrJrpfxb1EjI9_',
    },
    {
      id: 3,
      title: 'Artificial Intelligence: A Modern Approach',
      author: 'Stuart Russell',
      borrowDate: '15/08/2023',
      returnDate: '30/08/2023',
      status: 'ontime',
      fine: '-',
      isAiSuggested: true,
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBeUPAe8DIen8PKCBj7HW_nKxNgyuJ0SJajtD1w4Yq4GIQWiwrHp-5dhX9ExJMsCk5ua5jqays5OZaj5vqc1C1uNiujtqmG8WXJSFavWpJ1NqI1gAr24CCu_w9sj6dPwNY0k4POY-PBmJbf1sGGTZ1c5Pd2P2nMTwg9LFm3wDJzrhg764_brnAts-AjQLzawVkEhcfk3yHdLPPQKnyJrscWr_5dMAjnRtTcsHtMF-qYk2NM5lcqVzzJBLmD-WouoGACZgXC2FoVMQXv',
    },
  ]);

  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="flex flex-col gap-stack-lg">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">Lịch sử mượn trả</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Quản lý và theo dõi các tài liệu bạn đã mượn và hoàn trả.</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 bg-white border border-outline text-primary px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors shadow-sm">
              <span className="material-symbols-outlined text-sm">download</span>
              Xuất báo cáo
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl shadow-sm p-stack-md flex flex-col lg:flex-row gap-4 items-center justify-between border border-surface-container-highest">
          <div className="flex-1 w-full relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-lg focus:ring-2 focus:ring-secondary font-body-md text-body-md text-on-surface placeholder-on-surface-variant"
              placeholder="Tìm kiếm theo tên tài liệu, tác giả..."
              type="text"
            />
          </div>
          <div className="flex flex-wrap w-full lg:w-auto gap-3">
            <select className="bg-surface-container-low border-none rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary appearance-none pr-10 relative">
              <option value="">Tất cả thời gian</option>
              <option value="30">30 ngày qua</option>
              <option value="90">3 tháng qua</option>
              <option value="365">1 năm qua</option>
            </select>
            <select className="bg-surface-container-low border-none rounded-lg px-4 py-2 font-body-md text-body-md text-on-surface focus:ring-2 focus:ring-primary appearance-none pr-10">
              <option value="">Tất cả trạng thái</option>
              <option value="ontime">Đúng hạn</option>
              <option value="late">Trễ hạn</option>
              <option value="lost">Báo mất</option>
            </select>
            <button className="bg-surface-container-highest text-on-surface px-4 py-2 rounded-lg font-label-md text-label-md hover:bg-surface-variant transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Lọc thêm
            </button>
          </div>
        </div>

        {/* Data Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-container-highest overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container-highest">
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Tên tài liệu</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Ngày mượn</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Ngày trả thực tế</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Trạng thái</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant text-right whitespace-nowrap">Phí phạt</th>
                  <th className="px-6 py-4 font-label-md text-label-md text-on-surface-variant text-center whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-bright transition-colors relative">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-surface-container-highest rounded flex-shrink-0 overflow-hidden relative">
                          {item.isAiSuggested && (
                            <div className="absolute inset-0 bg-secondary/10 border border-secondary/30 pointer-events-none rounded"></div>
                          )}
                          <img alt="Book cover" className="w-full h-full object-cover" src={item.image} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-title-lg text-title-lg text-on-surface line-clamp-1">{item.title}</p>
                            {item.isAiSuggested && (
                              <span className="material-symbols-outlined text-secondary text-sm" style={{ fontVariationSettings: "'FILL' 1" }} title="Tài liệu được AI gợi ý mượn lại">
                                auto_awesome
                              </span>
                            )}
                          </div>
                          <p className="font-body-md text-body-md text-on-surface-variant text-sm">{item.author}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-body-md text-body-md text-on-surface whitespace-nowrap">{item.borrowDate}</td>
                    <td className="px-6 py-4 font-body-md text-body-md text-on-surface whitespace-nowrap">{item.returnDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'ontime' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#dcfce7] text-[#166534]">
                          Đã trả đúng hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-error-container text-on-error-container">
                          Trễ hạn (5 ngày)
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 font-body-md text-body-md text-right whitespace-nowrap ${item.fine !== '-' ? 'text-error font-medium' : 'text-on-surface'}`}>
                      {item.fine}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <button className="text-primary hover:text-primary-container p-1 rounded-full hover:bg-surface-container-low transition-colors" title="Chi tiết">
                        <span className="material-symbols-outlined">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="bg-surface-container-lowest px-6 py-4 border-t border-surface-container-highest flex items-center justify-between">
            <p className="font-body-md text-body-md text-on-surface-variant text-sm">Hiển thị 1-3 trong 45 kết quả</p>
            <div className="flex gap-1">
              <button className="p-2 rounded hover:bg-surface-container-low text-on-surface-variant disabled:opacity-50" disabled>
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 rounded bg-primary text-white font-label-md text-label-md flex items-center justify-center">1</button>
              <button className="w-8 h-8 rounded hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center">2</button>
              <button className="w-8 h-8 rounded hover:bg-surface-container-low text-on-surface font-label-md text-label-md flex items-center justify-center">3</button>
              <span className="w-8 h-8 flex items-center justify-center text-on-surface-variant">...</span>
              <button className="p-2 rounded hover:bg-surface-container-low text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
