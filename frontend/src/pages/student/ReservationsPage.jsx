import React, { useState } from 'react';
import MainLayout from '../../components/layout/MainLayout';

export default function ReservationsPage() {
  const [reservations] = useState([
    {
      id: 1,
      title: 'The Design of Everyday Things',
      author: 'Don Norman',
      status: 'ready',
      branch: 'Chi nhánh Trung tâm',
      dueDate: '15/11/2023',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGfK6O1GbcNeVyb8Mjd-SENl9BDlKHm8md8vtQrBIKvrwpflL75ovpF5nBxluiILek7eeOWcCA-l9b9MrbWRdwMXmJ59u-cWHeMiyWrMpDRcyY1K9u6Bglm7nueXkvgfObGw8VfK6KsocVs5vD0tOuDD2fv3jtS6JSK2w22rEfGCiDlgE_Jehsi4GczitMQl0P0mZ16gDTQ407kF52SRFdjcpGEfofaJpXMJFbF_tKEiUm7ckbMd2_sUAze_e_XazWkkPo4TymQcnR',
    },
    {
      id: 2,
      title: 'Thinking, Fast and Slow',
      author: 'Daniel Kahneman',
      status: 'waiting',
      position: 2,
      estimatedDate: '~2 tuần',
      image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1x2uF7RXiOqbfJKLU5sLSf6_ULSepxKpJrjY9W7_pJqEkY3H2VjFmjUvJxVXK8EiAgVP5S0sFqW5JrAG7ZhKs8C-BF1eSwCJ0HvJhRwH_JKgVXLYYGPPLJ8rjqBE4g8yGMZMqc6G_PxM9sj3p0iUP-K0qWZf7qiS7O6HmT_-s1c3uJJfbTmVKyH4Tp8YhbqVwUTJvR-iA0hl8OLBMmVKMXtqfUlsR37rLQbQsJzb07LNmDp_5KLW0Xc3nqAzqW2n1vhEMbXhVqpDTW',
    },
  ]);

  return (
    <MainLayout role="student" userName="Minh Tuấn" userRole="Sinh viên">
      <div className="max-w-container-max mx-auto space-y-stack-lg">
        <div className="mb-stack-lg">
          <h2 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-on-surface mb-stack-sm">
            Sách đang đặt giữ chỗ
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Theo dõi trạng thái và vị trí hàng đợi của các tài liệu bạn đã yêu cầu.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
          {/* Main List Area */}
          <div className="xl:col-span-8 flex flex-col gap-stack-md">
            {reservations.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_15px_rgba(0,0,0,0.1)] transition-all p-stack-md flex flex-col sm:flex-row gap-stack-md relative ${
                  item.status === 'ready' ? 'border-l-4 border-secondary' : ''
                }`}
              >
                <div className="w-24 h-32 flex-shrink-0 rounded-lg overflow-hidden border border-outline-variant">
                  <img alt="Book cover" className="w-full h-full object-cover" src={item.image} />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-stack-sm">
                    <div>
                      <h3 className="font-title-lg text-title-lg text-on-surface">{item.title}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant">{item.author}</p>
                    </div>
                    {item.status === 'ready' ? (
                      <span className="bg-[#e6f4ea] text-[#137333] px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        Sách đã về
                      </span>
                    ) : (
                      <span className="bg-[#fff8e1] text-[#f57f17] px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        Đang mượn bởi người khác
                      </span>
                    )}
                  </div>

                  {item.status === 'ready' ? (
                    <div className="bg-surface-bright rounded-lg p-3 mb-stack-md flex items-center gap-stack-sm">
                      <span className="material-symbols-outlined text-secondary">location_on</span>
                      <div>
                        <p className="font-label-md text-label-md text-on-surface">Nhận tại: {item.branch}</p>
                        <p className="font-label-sm text-label-sm text-on-surface-variant">
                          Vui lòng đến nhận trước ngày {item.dueDate}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 mb-stack-md">
                      <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                        <span className="material-symbols-outlined text-outline text-[20px]">queue</span>
                        Vị trí hàng đợi: <strong className="text-primary text-lg ml-1">#{item.position}</strong>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant font-label-md text-label-md">
                        <span className="material-symbols-outlined text-outline text-[20px]">local_shipping</span>
                        Dự kiến mượn từ: <span className="text-on-surface">Thư viện Kỹ thuật (Mượn liên chi nhánh)</span>
                      </div>
                      <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant text-right">
                        Dự kiến khả dụng: {item.estimatedDate}
                      </p>
                    </div>
                  )}

                  <div className="mt-auto flex justify-end">
                    {item.status === 'ready' ? (
                      <div className="flex gap-stack-sm">
                        <button className="px-4 py-2 bg-transparent border border-outline rounded-lg text-primary font-label-md text-label-md hover:bg-surface-container-low transition-colors">
                          Hủy đặt chỗ
                        </button>
                        <button className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm">
                          Xem chi tiết
                        </button>
                      </div>
                    ) : (
                      <button className="px-4 py-2 bg-transparent border border-error text-error rounded-lg font-label-md text-label-md hover:bg-error-container hover:text-on-error-container transition-colors">
                        Hủy đặt chỗ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Side Panel */}
          <div className="xl:col-span-4 flex flex-col gap-stack-md">
            {/* AI Insight Card */}
            <div className="bg-white rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05)] border-l border-secondary bg-opacity-5 p-stack-md relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-secondary text-on-secondary px-2 py-1 rounded-bl-lg font-label-sm text-label-sm flex items-center gap-1 shadow-sm">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span> AI Insight
              </div>
              <h3 className="font-title-lg text-title-lg text-on-surface mb-stack-sm mt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">lightbulb</span>
                Đề xuất thay thế
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-stack-md">
                Cuốn "Thinking, Fast and Slow" hiện có thời gian chờ khá lâu. AI của chúng tôi tìm thấy 2 tài liệu
                tương đương có sẵn ngay:
              </p>
              <ul className="flex flex-col gap-3">
                <li className="flex items-start gap-3 p-2 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer border border-transparent hover:border-outline-variant">
                  <div className="w-12 h-16 bg-surface-container-highest rounded shrink-0 overflow-hidden">
                    <img
                      alt="Alternative book"
                      className="w-full h-full object-cover"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDz38KcSOtHtq1MQJRqL50OU_-IQtKiSWUMVBfePL0q81i-W_gIr6kI38U_TSiyRIImGu83aiB4OZF3SMY7ba5tKXF3OdtqqVAx3-Z5mjEQx0IKAIsaNgBTZTtFMexhZRx6vXKz4_vJRg23XDGJx80pqTyhrYfl6i-N6qIv2Y1c6qIOdlXyTt7-5PbaLnod3jGQv3x3clE0-p3vYQQRDD5WxAxwPYUgyUfoYwcWg_2LoJt7auKVXDDlN1TnP5ongu_OYQCxJoZTAm_E"
                    />
                  </div>
                  <div>
                    <h4 className="font-label-md text-label-md font-semibold text-on-surface line-clamp-1">
                      Nudge: Improving Decisions
                    </h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Richard H. Thaler</p>
                    <span className="inline-block mt-1 bg-[#e6f4ea] text-[#137333] px-2 py-0.5 rounded text-[10px] font-medium">
                      Có sẵn tại Kho chính
                    </span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
