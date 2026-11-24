# App cộng đồng cư dân tòa TT01: mô tả dự án

Cập nhật: 24/11/2026 tối (bổ sung Sổ tay cư dân, bảng bằng chứng đồng ý, khóa chốt bầu, giữ Supabase hoạt động). Bản thật đang chạy thử trên Supabase và GitHub Pages với nhóm nhỏ. Bản thử offline (lưu dữ liệu trong điện thoại) vẫn còn nhưng không còn là bản chính.

## 1. Mục tiêu

- Cư dân phản ánh sự cố trong tòa nhà kèm ảnh bằng chứng có dấu thời gian, theo dõi vụ nào đang chờ, vụ nào đã xử lý.
- Tạo sức ép có hệ thống lên Ban quản lý vận hành (BQL) và chủ đầu tư thay vì để tin nhắn Zalo trôi mất.
- Làm nền cho việc bầu Ban quản trị (BQT) do cư dân bầu, có ghi lại ai bầu ai.
- Ghi nhận những người nhiệt tình (đại diện tầng, đại diện tòa) và công khai việc họ làm.
- Sau này mở rộng: sổ tay cư dân, dịch vụ và tiện ích quanh tòa, thanh toán.

## 2. Nền tảng và cách triển khai

| Thành phần | Dịch vụ | Ghi chú |
|---|---|---|
| Giao diện | Web PWA, tĩnh, GitHub Pages | Không có máy chủ riêng, không làm app Android riêng |
| Dữ liệu, đăng nhập, lưu ảnh | Supabase (Postgres, Auth, Storage) | Quyền truy cập chặn ở máy chủ bằng RLS và các hàm RPC |
| Xem trước link khi chia sẻ (Zalo) | Cloudflare Worker | Trả thẻ Open Graph riêng cho từng bài Bảng tin |

- **Tệp giao diện**: `index.html` (mã và nội dung), `sotay.js` (mã mục Sổ tay cư dân), `style.css` (bố cục), `theme.css` (toàn bộ màu, gồm sáng, tối, desktop), `supabase.js` (thư viện, đặt sẵn trong thư mục), `og-thumb.jpg` (ảnh xem trước mặc định 1200x630). `index.html` gọi CSS kèm số phiên bản (`style.css?v=...`) để trình duyệt luôn tải bản mới.
- **Khóa trong mã**: chỉ có khóa công khai (publishable) của Supabase, an toàn khi để trong mã. Không để mật khẩu hay khóa bí mật trong mã.
- **Xem trước link**: Zalo không chạy JavaScript và bỏ qua phần `#`, nên link bài Bảng tin dạng `.../p/<id>` đi qua Worker. Worker đọc view công khai `posts_public` (không có bài ẩn), trả tiêu đề, tóm tắt, ảnh bìa rồi chuyển người dùng về trang chính. Phản ánh và hoạt động nội bộ không có xem trước riêng.
- **Đăng nhập**: email và mật khẩu. Đang tắt bước xác nhận email trong giai đoạn thử. Trước khi mở cho cả tòa sẽ bật xác nhận email kèm SMTP riêng (Brevo hoặc Resend). Đăng nhập bằng số điện thoại (SMS OTP) để sau vì tốn phí.
- **Giới hạn gói miễn phí Supabase**: 1 GB lưu trữ, 5 GB băng thông, 500 MB cơ sở dữ liệu, tệp tối đa 50 MB, dự án bị tạm dừng sau một tuần không hoạt động (đã có GitHub Actions `keepalive.yml` gọi Supabase hai ngày một lần). Hiện mức dùng gần như bằng 0. Không tự động xóa ảnh bằng chứng. Cloudflare Worker miễn phí 100 nghìn yêu cầu mỗi ngày.
- **Zalo**: không có cách chính thức để tự đọc nhóm Zalo. Dùng nút Sao chép link và chia sẻ, không dùng tự động hóa không chính thức.

## 3. Cư dân, căn hộ và xác minh

### 3.1. Khai báo căn hộ

Khi đăng ký, mỗi người khai tầng, số căn (4 chữ số, khớp với tầng) và vai trò với căn đó. Có thể khai nhiều căn.

| Vai trò khai | Ai xác minh | Ghi chú |
|---|---|---|
| Chủ sở hữu | Admin, moderator (mọi tầng), đại diện tầng (tầng mình) | Có thể được chọn làm **chủ hộ** |
| Người thuê | **Chủ hộ** của căn đó | BQL và admin không thấy ai thuê |
| Người sống cùng (vợ, chồng, con, bố mẹ) | **Chủ hộ** của căn đó | Cùng cơ chế với người thuê |

- Mỗi căn chỉ có **một chủ hộ** đã xác minh. Chỉ chủ hộ được bỏ phiếu, mỗi căn một phiếu.
- Không ai tự xác minh căn của mình. Không có ràng buộc nào khóa căn cho người khai đầu tiên: nếu ai đó khai nhầm hoặc khai bừa, chủ hộ thật vẫn khai và được duyệt sau.
- **Từ chối** có lý do chọn sẵn. Người bị từ chối thấy lý do trong "Của tôi" và có nút **Khai lại căn này**.
- **Thu hồi xác minh** (cùng quy tắc quyền như xác minh) có lý do. Nếu thu hồi chủ hộ, người thuê và người sống cùng trong căn quay về "chờ xác minh".
- **Nhượng quyền chủ hộ**: chủ hộ chuyển cho chủ sở hữu hoặc người sống cùng đã xác minh trong căn (không cho người thuê). Người nhận thành chủ sở hữu và chủ hộ.
- **Xóa căn khai nhầm**: người dùng tự xóa, trừ chủ hộ đã xác minh (phải nhượng quyền trước).
- Mọi lần xác minh, từ chối, thu hồi, nhượng quyền, khai lại, xóa được ghi vào lịch sử (`unit_log`). Người có quyền xem 6 mục gần nhất trong hồ sơ thành viên.
- Quyền hiện tại của người thuê và người sống cùng: sau khi được xác minh, họ gửi phản ánh, bình luận, thả cảm xúc, bấm "Tôi cũng gặp" như mọi cư dân đã xác minh, không bỏ phiếu. Vai trò "khách thuê" hẹp hơn (chỉ xem tin, liên hệ chủ nhà) vẫn đang là câu hỏi mở (mục 12).

### 3.2. Thông báo trong ứng dụng

- Người duyệt: chấm đỏ số trên avatar và thẻ ở Trang chủ "N yêu cầu xác minh đang chờ bạn". Số này tính trực tiếp từ dữ liệu, mỗi người chỉ thấy yêu cầu mình có quyền duyệt.
- Người khai: được báo khi căn được xác minh, bị từ chối (kèm lý do), bị thu hồi, cần xác minh lại, được giao làm chủ hộ.
- Cả hai đều được báo khi mở đợt bầu ở tầng mình, và người được giao hoặc được bầu làm đại diện được báo.
- Ứng dụng tự kiểm tra thông báo mỗi 60 giây và mỗi khi quay lại. **Chưa có thông báo đẩy** ra ngoài ứng dụng (cần email SMTP hoặc Zalo OA).

## 4. Quyền và vai trò

Vai trò là tập hợp quyền, mỗi quyền có phạm vi `all` (cả tòa) hoặc `floor` (tầng). Super admin chỉnh được vai trò và quyền. Người giữ chức (đại diện tòa, phó đại diện tòa, đại diện tầng) nằm ở bảng `office_holders`, trạng thái "lâm thời" hoặc "được bầu".

| Quyền | Ý nghĩa |
|---|---|
| manage_roles | Quản lý vai trò, thêm hoặc gỡ người giữ chức, bổ nhiệm |
| manage_settings | Cài đặt, bật tắt module (chỉ super admin) |
| verify_unit, set_head | Xác minh chủ sở hữu, chọn chủ hộ |
| view_floor_members, view_private_profile | Xem thành viên mọi tầng, xem hồ sơ riêng tư |
| edit_member | Sửa thông tin thành viên (có nhật ký sửa) |
| set_case_status, approve_case, flag_urgent | Xử lý phản ánh |
| hide_content | Ẩn bình luận và nội dung |
| post_news, approve_post, post_activity | Đăng tin, duyệt bài, đăng hoạt động BQT |
| manage_election | Mở và đóng đợt bầu |

- Mặc định: super admin có tất cả. Moderator có xác minh, xử lý phản ánh, ẩn nội dung, đăng tin và hoạt động (mọi tầng). Đại diện tầng xác minh và xử lý phản ánh tầng mình, được đăng tin và hoạt động. Đại diện tòa chỉ đăng tin và hoạt động.
- **Cài đặt** (menu 3 gạch, chỉ super admin thấy): trạng thái từng module, số tầng tối đa một người được làm đại diện, công tắc hiện số căn trong danh sách thành viên tầng.
- Super admin thấy mọi thứ ở Quản trị và module ở trạng thái "chỉ admin thấy".

## 5. Phản ánh và bằng chứng

- Trạng thái: Mới → Đã gửi BQL → Đã trả lời → Hoàn thành, hoặc Drop. Thanh tiến trình trong chi tiết, lịch sử đổi trạng thái được ghi.
- Ảnh bằng chứng: giờ lấy từ **máy chủ** (múi giờ Việt Nam), mã băm SHA-256 mỗi ảnh (hiển thị gọn "✓ Ảnh đã xác thực · 8 ký tự…", bấm để xem đầy đủ và sao chép), ảnh in dòng ngày giờ, tòa, tầng, khu vực. Hai cách thêm ảnh: chụp trực tiếp hoặc tải lên (ghi nhận là ảnh tải lên). Lịch sử chỉ thêm vào, "ẩn" thay cho xóa.
- **"Tôi cũng gặp"**: mỗi căn một lần cho mỗi vụ việc. Độ ưu tiên dựa trên số căn gặp và số ngày chờ. Có cờ **Khẩn cấp**.
- **Hiển thị căn hộ**: ngoài danh sách (thẻ bài đăng, danh sách gọn) chỉ hiện "Tầng N". Vào chi tiết mới thấy "Tầng N · căn X" và danh sách căn đã gặp theo tầng (không có tên).
- Admin chọn chế độ phản ánh mới: hiện ngay hoặc chờ duyệt (chờ duyệt thì chỉ tác giả và người điều phối thấy).
- Nút sao chép nội dung để gửi BQL, nút Sao chép link.

## 6. Bảng tin và tương tác

- Loại bài: Thông báo, Sự kiện, Xử phạt (cần duyệt), Đồ thất lạc. Chỉ đăng thông tin của tòa nhà.
- **Người đăng**: tự động ghi theo người thật. Quản trị hệ thống hiện là "Admin". Người giữ chức hiện "Tên, Đại diện tầng N" hoặc "Đại diện tòa". Nhãn được khóa lúc đăng. Mỗi bài có **Loại nguồn** (nhãn: *Từ thông báo BQL*, *Cư dân tổng hợp*, *Nguồn bên ngoài*, hiện trên thẻ bài, trang chi tiết và cả với khách) và trường **Nguồn thông tin** (credit chi tiết, ví dụ "Thông báo BQL ngày …"). Bài cũ mặc định là "Cư dân tổng hợp", người có quyền sửa bài để đổi nhãn.
- **Quản lý bài**: tác giả sửa và xóa bài của mình (hiện "đã chỉnh sửa"). Người có quyền duyệt, ẩn, ghim hoặc gỡ duyệt. Bài ẩn không hiện với cư dân và khách. Khi xóa bài, bình luận và cảm xúc đi kèm bị xóa theo.
- **Hoạt động BQT**: bài do đại diện đăng, có ảnh, ghim, sửa, xóa, ẩn. Có bài ghim "Kế hoạch thành lập BQT".
- **Bình luận**: hiển thị tối đa 5 bình luận mới nhất ngay trên thẻ bài, xếp cũ đến mới, có dòng "Xem tất cả N bình luận". Bình luận bị ẩn không hiện. Tác giả xóa bình luận của mình, người có quyền ẩn.
- **Cảm xúc**: Thích và Giận dữ, mỗi người một cảm xúc mỗi bài. Bấm vào con số để xem **ai đã thả** (tên, ảnh đại diện). Áp dụng cho phản ánh, bảng tin, hoạt động.
- **Chân trang** (mọi trang) luôn có dòng nêu TT01 là kênh cộng đồng độc lập, không trực thuộc hoặc đại diện BQL Yên Bình Complex, kèm link sang mục Giới thiệu.
- **Khách chưa đăng nhập** xem được Bảng tin dạng tóm tắt (Thông báo và Sự kiện), bấm vào thì mời đăng nhập. Việc ẩn do máy chủ chặn bằng RLS, không chỉ giao diện.

## 6A. Giới thiệu TT01 (About Us) và đồng ý thông tin cá nhân

- Mục **Giới thiệu TT01 (About Us)** nằm trong menu 3 gạch, hiện cả với khách và người đã đăng nhập. Bốn phần: TT01 là gì, Mục đích hoạt động, Nguồn thông tin, Tính độc lập và trách nhiệm. Mục đích là xác lập vai trò và ranh giới: kênh cộng đồng độc lập, không phải kênh chính thức, không thay thế thông báo của BQL.
- **Đăng ký** có ô tích bắt buộc "Tôi đồng ý cung cấp thông tin cá nhân", kèm nội dung mở rộng: thu thập gì (họ tên, email, thông tin căn hộ, nội dung đăng), dùng để làm gì (xác minh cư dân, vận hành, thông báo trong ứng dụng), ai thấy được, và quyền nhờ quản trị viên chỉnh sửa hoặc xóa.
- Bằng chứng đồng ý nằm ở bảng `consents` (người dùng, phiên bản, giờ máy chủ, giờ trên máy người dùng, cách ghi: signup / app / metadata). Chỉ thêm, không sửa, không xóa qua ứng dụng. Metadata tài khoản (`consent_at`, `consent_ver`) vẫn ghi kèm nhưng chỉ là bản phụ vì người dùng tự sửa được. Người đăng ký đã tích đồng ý được ghi vào bảng tự động ở lần đăng nhập đầu.
- **Tài khoản cũ** gặp màn "Đồng ý cung cấp thông tin cá nhân" một lần khi đăng nhập; chưa đồng ý thì chưa dùng tiếp được (vẫn xem được Giới thiệu).
- Cần rà lại nội dung đồng ý cho đúng thực tế vận hành (ví dụ cam kết không chia sẻ cho bên thứ ba vì mục đích thương mại) và, nếu cần, hỏi ý kiến người am hiểu pháp lý về bảo vệ dữ liệu cá nhân.

## 7. Ban quản trị (mục Quản trị)

Ba tab, thứ tự hiển thị: **Thành viên** (mở mặc định), **Hoạt động**, **Đề án**.

- **Hoạt động**: các bài hoạt động của BQT lâm thời.
- **Thành viên**: Đại diện tòa, **Đại diện tầng**, **Thành viên tầng**, và **Tìm thành viên** (chỉ người có quyền sửa thành viên).
  - *Đại diện tầng*: danh sách từng tầng từ thấp đến cao, mỗi tầng một khối với người đại diện. Tầng chưa có đại diện nằm dưới cùng. Người được bầu có nút "Ai đã bầu". Admin thêm hoặc gỡ đại diện lâm thời.
  - *Thành viên tầng*: chỉ thấy các tầng mình có căn đã xác minh (người quản lý thấy mọi tầng). Mỗi người một thẻ, liệt kê **tất cả căn** người đó có trên tầng, nhãn "Chủ hộ", "Đại diện tầng". Số căn của người khác chỉ hiện nếu admin bật công tắc "hiện số căn"; người quản lý và chính chủ luôn thấy. Việc chặn số căn làm ở máy chủ.
- **Đề án**: đề án thành lập BQT dạng 5 bước có trạng thái (nội dung mẫu, sẽ thay bằng đề án chính thức): lập nhóm điều hành lâm thời, thu thập và xác nhận cư dân (mục tiêu 60% số căn), bầu đại diện từng tầng, bầu đại diện tòa, chuẩn bị hội nghị nhà chung cư chính thức.
- **Hồ sơ thành viên**: năm sinh, học vấn, nghề nghiệp, kinh nghiệm, ghi chú. Mỗi người chọn công khai hoặc riêng tư (chỉ người có quyền thấy). Số điện thoại: mỗi người chọn công khai hoặc chỉ cho thành viên tầng (mặc định chỉ thành viên tầng).
- **Admin sửa thông tin thành viên** (tên sai, thiếu số điện thoại…): mọi thay đổi ghi vào nhật ký cũ/mới, người được sửa xem được.
- Lưu ý pháp lý: bầu trong ứng dụng chỉ là bầu nội bộ lấy sự tín nhiệm. BQT chính thức phải qua hội nghị nhà chung cư theo quy định. Cần hỏi UBND phường hoặc luật sư.

## 8. Bầu cử

### 8.1. Bầu đại diện tầng (trong tab Thành viên tầng)

1. Admin (quyền manage_election) chọn tầng, bấm "+ Mở đợt bầu đại diện tầng N", đặt tên và hạn bỏ phiếu (mặc định 7 ngày). Các chủ hộ của tầng được thông báo.
2. Thẻ **chủ hộ** hiện nút **Bầu**. Không có bước đăng ký ứng cử: chủ hộ bầu cho chủ hộ khác trong tầng (kể cả chính mình). Mỗi căn một phiếu (người có nhiều căn bầu một phiếu cho mỗi căn), đổi phiếu được đến hạn. Người thuê, người sống cùng và chủ sở hữu không phải chủ hộ không bầu.
3. Trong lúc bầu chỉ hiện "đã bỏ phiếu x/y căn". Chưa ai thấy kết quả.
4. Admin bấm "Đóng bỏ phiếu và chốt kết quả", hoặc đợt tự chốt khi hết hạn (hệ thống chốt ngay khi có người mở trang). Người nhiều phiếu nhất **tự thành đại diện tầng** (trạng thái "được bầu", thay người cũ) và hiện ở tab Đại diện tầng.
5. Sau khi đóng: công khai số phiếu và **danh sách người bầu cho ai** (kèm thời gian đợt bầu). Chỉ người có căn đã xác minh ở tầng đó và người quản lý xem được. Số căn người bầu chỉ hiện theo công tắc "hiện số căn".
6. Lưu trữ: thời gian mở và đóng, từng phiếu (người bầu, căn, ứng viên, giờ), kết quả, người thắng. Người đại diện gắn với đợt bầu đã chọn họ.
- Không tự bổ nhiệm khi: hòa phiếu ở đầu, không có phiếu nào, hoặc người thắng đã giữ đủ số tầng cho phép (mặc định 2). Khi đó giữ nguyên đại diện cũ, giao diện báo lý do, admin xử lý (thêm đại diện tay hoặc mở đợt mới).
- Ngưỡng tham gia (quorum, mặc định 50%) hiện đang chỉ để hiển thị, không chặn việc chốt.
- Chốt kết quả có khóa theo từng đợt bầu (`pg_advisory_xact_lock`): nhiều người mở trang cùng lúc khi hết hạn thì chỉ một người chốt. Hàm gốc đổi tên thành `finalize_election_core`, `finalize_election` là lớp khóa bọc ngoài.

### 8.2. Bầu đại diện tòa

Chưa đổi: ứng viên đăng ký, phiếu **kín** (không ai đọc được, kể cả admin), mỗi căn một phiếu, admin bổ nhiệm người nhiều phiếu nhất sau khi đóng (hòa phiếu thì báo lỗi).

## 9. Module và menu

- Công tắc module (bảng `modules`, trạng thái: mở cho mọi người, sắp ra mắt, chỉ admin thấy, tắt): Quản trị (mở), Sổ tay cư dân (patch 10 đặt "chỉ admin thấy" để thử, sau đó mở), Dịch vụ và tiện ích gồm quán ăn (chỉ admin thấy), Thanh toán (chỉ admin thấy).
- Menu 3 gạch: nhóm Chức năng (Trang chủ, Phản ánh, Bảng tin, Quản trị, **Sổ tay cư dân** khi module mở, Của tôi, Cài đặt cho super admin, và **Giới thiệu TT01 (About Us)** cho mọi người) và nhóm Sắp ra mắt. Trang chủ có thẻ lối tắt vào Sổ tay.
- Module chưa công bố không hiện với cư dân thường.

## 9A. Sổ tay cư dân

Ba mục (tab), dùng chung bảng chủ đề `hb_topics` (super admin thêm, đổi tên, sắp xếp, ẩn trong Cài đặt). Chủ đề mặc định: Luật và quy định, Nội quy tòa nhà, Điện nước, Chăm sóc nhà cửa, An toàn và phòng cháy, Dịch vụ quán ăn, Dịch vụ sửa chữa, Gia đình và con trẻ, Khác.

| Mục | Ai đăng | Đính kèm | Ghi chú |
|---|---|---|---|
| Tài liệu tham khảo (luật, nội quy, kiến thức) | Chỉ admin (quyền `post_handbook`) | Tối đa 5 file, PDF/Word/Excel/ảnh, 20 MB mỗi file | Tên người đăng hiện "Admin", có trường Nguồn (số hiệu, ngày ban hành, link) |
| Mẹo vặt | Cư dân đã khai căn và admin (mặc định). Super admin tắt được (`settings.hb_tip_open`) | Ảnh minh họa | Kinh nghiệm sửa chữa, chăm sóc nhà, dịch vụ quanh tòa |
| Hỏi đáp | Cư dân đã khai căn và admin | Ảnh minh họa | Để hiểu thêm và thảo luận, **không** gửi BQL. Màn đặt câu hỏi nhắc chuyển sang Phản ánh nếu cần BQL xử lý. Có cờ "Đã giải đáp" |

- Cư dân: bình luận, thả tim (chỉ tim), sao chép link (`#hbitem-<id>`), bấm số tim để xem ai đã thả. Tác giả sửa, xóa bài và bình luận của mình. Admin sửa, xóa, ghim, ẩn mọi bài. Moderator chỉ ẩn hoặc hiện lại.
- Người hỏi được thông báo trong ứng dụng khi có người khác bình luận.
- **Câu hỏi liên quan**: admin liên kết các câu hỏi cùng nội dung thành nhóm (cột `ref_group`, hàm `hb_link`, `hb_unlink`; nối vào nhóm đã có thì gộp nhóm). Mỗi câu hiện mục "Câu hỏi liên quan" từ cũ đến mới để người đọc thấy lịch sử hỏi đáp. Giao diện gợi ý câu giống tiêu đề (so từ, bỏ dấu, bỏ từ phổ biến).
- **Admin xóa bài** kèm lý do qua hàm `hb_admin_delete`: báo tác giả, dẫn sang câu còn lại trong nhóm, trả danh sách file để xóa khỏi kho, nhóm còn một câu thì tự giải tán.
- **Quản lý bài** (admin, moderator): lọc theo mục, "có thể trùng", chưa giải đáp, chưa có bình luận, đang ẩn; chọn nhiều bài để ẩn, hiện, xóa.
- **Bài đăng của tôi** (mọi người, từ trang Của tôi): bài của mình ở Sổ tay, Phản ánh, Bảng tin, Hoạt động, kèm số bình luận và tim nhận được.
- Tìm kiếm theo chữ trong tab đang mở, lọc theo chủ đề.
- Khách chưa đăng nhập không đọc được Sổ tay (chặn bằng RLS). File đính kèm nằm trong kho riêng `handbook-files`, mở bằng link ký tạm 1 giờ.
- Chặn ở máy chủ: ai được đăng loại bài nào, chỉ admin đính kèm file, moderator không sửa được nội dung, không bình luận hoặc thả tim vào bài đã ẩn, tên người đăng và giờ đăng do máy chủ gán.

## 10. Giao diện

- **Màu**: xanh lá rêu và xám xanh, có chế độ sáng, tối, theo máy. Toàn bộ màu nằm trong `theme.css`, bố cục trong `style.css`.
- **Phong cách**: gradient nhẹ và kính mờ, màu đỏ chỉ dùng cho khẩn cấp và chấm thông báo.
- **Thanh trên cùng**: icon 3 gạch, TT01, Trang chủ, Phản ánh, Bảng tin, Quản trị, avatar (vào "Của tôi", có chấm đỏ thông báo). Đã thu gọn để avatar luôn nằm trọn từ 320px đến desktop.
- **Bài đăng kiểu Instagram**, thứ tự cho cả điện thoại và desktop: tên người đăng, **caption và nội dung**, ảnh, hàng nút (Thích, Giận dữ, Bình luận, Sao chép link), bình luận. Trên điện thoại bài tràn viền. Desktop giữ dạng thẻ, cột giữa rộng 760px.
- Trang chủ: số liệu, **ô tìm kiếm**, thông báo mới, lối tắt Sổ tay, mục Mới nhất.
- **Tìm kiếm**: tìm trong Bảng tin, Phản ánh, Sổ tay, Hoạt động (theo quyền xem của người dùng). Không phân biệt dấu, nhiều từ thì phải khớp đủ các từ, tiêu đề khớp xếp trước, từ khóa được tô sáng. Kết quả nhanh ngay ở Trang chủ, trang Tìm kiếm riêng có lọc theo mục. Tìm trên dữ liệu gần nhất (300 bài Bảng tin, 100 phản ánh, 400 bài Sổ tay, 200 hoạt động); khi dữ liệu lớn hơn sẽ chuyển sang tìm ở máy chủ.
- **Thẻ bài đăng**: nhãn loại bài, nhãn nguồn, trạng thái nằm dưới tên người đăng để tên dài không bị ép xuống dòng trên điện thoại. Phản ánh và Bảng tin có nút đổi giữa **Bài đăng** và **Danh sách gọn**, nhớ lựa chọn.
- **Icon ứng dụng và PWA**: icon vuông tràn khung (chung cư TT01 làm mờ, chữ TT01 xanh dương viền trắng, sóng xanh), kèm `manifest.webmanifest` để thêm vào màn hình chính điện thoại (chạy toàn màn hình, tên "TT01"). Gồm `icon-64.png`, `apple-touch-icon.png` (180px), `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`. Chữ TT01 nằm trong vùng an toàn: bản thường rộng 66%, bản maskable (Android) rộng 48% và thu cả cảnh chung cư vào 70% ở giữa, vì Android chỉ hiện khoảng 2/3 ở giữa rồi cắt theo hình của máy. Các file icon và manifest được gọi kèm `?v=2` để tránh bộ nhớ đệm; đổi icon lần sau thì tăng số này. Người đã lưu web từ trước cần xóa và thêm lại để thấy icon mới.
- Tên "Của tôi": hồ sơ, số điện thoại, quyền riêng tư, căn hộ của tôi (trạng thái, lý do, khai lại, xóa, người trong căn nếu là chủ hộ), giao diện, tài khoản.

## 11. Kiến trúc dữ liệu và thứ tự cài SQL

Bảng chính: `hb_topics`, `hb_items`, `hb_comments`, `hb_reactions`, `consents`, `profiles`, `profile_details`, `contacts`, `units`, `user_units`, `unit_log`, `cases`, `case_photos`, `case_units`, `case_history`, `posts`, `activities`, `comments`, `reactions`, `roles`, `role_permissions`, `user_roles`, `office_holders`, `elections`, `candidates`, `ballots`, `settings`, `modules`, `member_edits`, `notifications`. Kho ảnh và file: `evidence` (riêng tư, ảnh bằng chứng), `public-media` (công khai, ảnh bài đăng), `handbook-files` (riêng tư, tài liệu Sổ tay). Hàm quan trọng: `has_perm`, `my_permissions`, `my_modules`, `claim_unit`, `verify_unit`, `revoke_unit`, `transfer_head`, `delete_my_unit`, `floor_members`, `cast_vote`, `finalize_election`, `election_results`, `election_voters`.

Chạy trong Supabase SQL Editor theo thứ tự (mọi file chạy lại được nhiều lần):

| Thứ tự | File | Nội dung |
|---|---|---|
| 0 | `tt01_schema.sql` | Cấu trúc gốc, quyền cơ bản |
| 1 | `tt01_patch1_permissions.sql` | Vai trò, quyền theo phạm vi |
| 2 | `tt01_patch2_modules_board.sql` | Công tắc module, bổ nhiệm đại diện |
| 3 | `tt01_patch3_post_manage.sql` | Người đăng, nguồn, sửa, ẩn, duyệt, xóa bài |
| 4 | `tt01_patch4_member_edit.sql` | Admin sửa thành viên, nhật ký |
| 5 | `tt01_patch5_show_units.sql` | Công tắc hiện số căn (đã gộp vào patch 7) |
| 6 | `tt01_patch6_household.sql` | Người sống cùng, thu hồi, nhượng quyền, khai lại, lịch sử |
| 7 | `tt01_patch7_floor_vote.sql` | Bầu đại diện tầng ở Thành viên tầng, chốt kết quả, xóa căn khai nhầm |
| 8 | `tt01_patch8_notifications.sql` | Thông báo trong ứng dụng |
| 9 | `tt01_patch9_source_kind.sql` | Nhãn loại nguồn của bài đăng (cột `source_kind`, cập nhật `posts_public`) |
| 10 | `tt01_patch10_handbook.sql` | Sổ tay cư dân (liên kết câu hỏi, admin xóa kèm lý do), quyền `post_handbook`, kho `handbook-files`, bảng `consents`, khóa chốt bầu |

Giao diện chạy được khi chưa cài patch mới nhưng các nút tương ứng sẽ báo lỗi. Hướng dẫn đăng trang và cấu hình chi tiết nằm trong `HUONG-DAN-DANG-TRANG.md`.

## 12. Việc chưa làm hoặc cần quyết định

**Đã chốt, sẽ làm theo lộ trình**
- Bước 2: vai trò **khách thuê** (xem tin, liên hệ chủ nhà qua số điện thoại hoặc Zalo chủ nhà cho phép, không bỏ phiếu, do chủ hộ tạo và xác nhận). Hiện người thuê đã xác minh được dùng quyền như cư dân đã xác minh, cần quyết định có thu hẹp không (ví dụ không gửi phản ánh).
- ~~Bước 3: Sổ tay cư dân~~: đã làm (mục 9A). Còn lại: nạp tài liệu thật (Luật Nhà ở, nội quy tòa, quy chế quản lý sử dụng).
- Bước 4: **Dịch vụ và tiện ích** gồm mục quảng cáo quán ăn, chưa công khai.
- Bước 5: **Thanh toán**, chưa công bố, làm sau cùng (xem mục 13).

**Cần làm trước khi mở cho cả tòa**
- Rà lại nội dung Giới thiệu và phần đồng ý thông tin cá nhân (mục 6A). Phần đồng ý chưa nhắc đến nội dung đăng trong Sổ tay (câu hỏi, mẹo, bình luận).
- Bật xác nhận email kèm SMTP riêng.
- Thông báo đẩy ra ngoài ứng dụng (email trước, Zalo sau nếu cần).
- Nội dung đề án thành lập BQT chính thức: mỗi bước cần mục tiêu, người phụ trách, thời hạn, kết quả cần đạt. Nếu muốn admin tự đổi trạng thái từng bước trong ứng dụng thì cần thêm một bảng dữ liệu.

**Cần quyết định**
- Chặn bổ nhiệm khi chưa đủ quorum, nhiệm kỳ của đại diện, bãi nhiệm bằng đề nghị đủ chữ ký.
- Cho từng người "ẩn căn của tôi" trong danh sách căn đã gặp, hoặc hiện tên cho đại diện tầng.
- Đại diện tầng chỉ thấy phản ánh của tầng mình hay thấy tất cả.
- Giới hạn con dưới 18 tuổi ở mức xem tin.
- Bầu đại diện tòa có chuyển sang cách bầu công khai như bầu tầng hay giữ phiếu kín.
- Đa ngôn ngữ (Việt, Anh, Hàn, Trung), xuất email và PDF, "Dán và đăng" từ Zalo, bố cục hai cột trên desktop cho người quản lý.
- Khai báo lưu trú và xuất nhập cảnh cho khách: tạm hoãn.

## 13. Module thanh toán (để sau)

- Admin quy định tài khoản nhận tiền và cú pháp chuyển khoản chuẩn. Người dùng chỉ **sao chép nội dung chuyển khoản** (mã căn và cú pháp) rồi tự chuyển.
- Chống giả mạo: đổi tài khoản nhận cần hai admin duyệt, khóa tài khoản sau khi mở đợt thu, cảnh báo tên giống và số tài khoản gần giống.
- Đối soát bằng sao kê hoặc webhook (như SePay, Casso) là tùy chọn. Cần xem xét pháp nhân và quy định khi thu hộ tiền.

## 14. Cách kiểm thử

- Giao diện: Playwright chạy trên một lớp giả lập Supabase (`window.__SB_MOCK`) cho các luồng chính (đăng ký, phản ánh, bảng tin, quản trị, bầu cử, thông báo, thu hồi, nhượng quyền…), kiểm tra cả bố cục điện thoại và desktop.
- SQL: chạy toàn bộ file trên Postgres 16 thật (patch 10 kiểm thử trên schema giả lập Supabase: 47 trường hợp quyền theo vai trò, chạy hai lần, khóa chốt bầu với hai phiên đồng thời), có bộ kiểm tra riêng cho quyền, bầu cử, xác minh, thông báo, kiểm tra chạy lại nhiều lần và thứ tự cài.
- Vấn đề chỉ lộ ra khi chạy trên Supabase thật (cấu hình, quyền, bộ nhớ đệm) được xử lý qua ảnh chụp màn hình và thông báo lỗi do người dùng gửi.
