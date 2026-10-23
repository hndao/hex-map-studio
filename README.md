# Hex Map Studio

Công cụ local để chuyển ảnh thành map lục giác cho **Hex Color Sort**. Repository này độc lập với game Unity: <https://github.com/hndao/hex-map-studio> (private).

## Chạy công cụ

Cần Node.js 20 trở lên; không có dependency npm hoặc bước build.

```sh
npm start
```

Mở `http://localhost:4173`. Nếu cổng đang dùng, đặt `HEX_MAP_PORT` khi khởi động. Server chỉ lắng nghe loopback. Ảnh được đọc trong trình duyệt, không gửi lên server hoặc dịch vụ ngoài. Không cần tài khoản, API key hay kết nối Internet khi sử dụng.

## Tạo một map

1. Chọn tranh PNG/JPG/WebP, tối đa 20 MB; ảnh có nền trong suốt giúp bỏ vùng không có slot. Ưu tiên tranh phẳng rõ hình thay vì screenshot có HUD/viền/ánh sáng đá.
2. Chọn 2–64 cột/hàng, tối đa 4.096 slot; chỉnh ngưỡng alpha và các màu được phép dùng.
3. Bấm **Chuyển ảnh thành ô**. Ảnh giữ tỷ lệ, các ô ngoài hình/vùng trong suốt bị loại. Màu lấy mẫu được ánh xạ về palette bằng khoảng cách CIELAB.
4. Xem **Màu đích**, **Ban đầu** hoặc **Slot trống**. Tô sửa màu đích hoặc xóa slot; có hoàn tác 30 bước. Cuộn/nút ± để zoom, chọn Di chuyển để kéo.
5. Nhập tên map, seed, chế độ và khay phụ. Bấm **Kiểm tra và tạo màn**. Công cụ kiểm tra schema, bảo toàn từng màu, sinh chuỗi thao tác và chạy lại đến khi hoàn thành bằng 3 ô khay mở sẵn.
6. Tải JSON cho game. Báo cáo lời giải là file riêng dành cho QA, có SHA-256 ràng buộc với đúng JSON; không cần đưa vào player.

Map hình học có sẵn là dữ liệu demo kiểm tra, không phải level đã được duyệt. Sau khi sửa dữ liệu hoặc cấu hình, bản xuất bị vô hiệu hóa cho đến khi kiểm tra lại.

## Ranh giới với game

- [Schema v2](contracts/level-v2.schema.json): tọa độ axial `q/r`, `targetColorId`, `initialBeanColorId`, seed và cấu hình. Không có PNG, mask, base64, đường dẫn ảnh, `rewardArtId` hay `revealGroups` trong level v2.
- [Palette dùng chung](contracts/palette-six-v1.json): sáu màu tương ứng sprite R03 của game. Preview là hex dựng bằng canvas, không phải render sprite Unity.
- Game đọc JSON và dùng bộ sprite chung. Tranh nguồn/PSD/ImageGen ở thư viện thiết kế, ngoài bản game; công cụ không tự chép file vào game.
- Hiện chỉ hỗ trợ sáu màu có sprite. Trắng/kem/indigo trong một tranh thiên nga sẽ được chuyển về màu gần nhất hiện có; chưa thể bảo toàn palette của mockup R07. Muốn thêm màu cần revision palette và asset native tương ứng, không chỉ nhập một RGB tùy ý vào level.
- Lưới flat-top dùng `x=1.5*q`, `worldY=sqrt(3)*(r+q/2)` và screenY đảo chiều. Thứ tự xuất q rồi r; các ô thiếu là khoảng trống, không tự tạo ô phụ.
- Seed là số nguyên `0..2147483647`; tọa độ `-128..128`; timer `0` cho thư giãn hoặc `1..600` cho tính giờ; khay 5–7, ba mở sẵn.

## Kiểm tra

```sh
npm test
node test/generate-fixtures.mjs
```

Fixtures/lời giải được tạo trong `.artifacts/fixtures` và không commit. Có thể đưa thư mục này cho standalone `tools/PictureChecks` của game để kiểm tra tương thích C#.

Browser QA là runner tùy chọn, cần Playwright có sẵn, một Chromium executable và ảnh được phép dùng:

```sh
HEX_MAP_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs HEX_MAP_CHROMIUM=/absolute/path/to/chrome HEX_MAP_TEST_IMAGE=/absolute/path/to/image.png node test/browser-smoke.mjs
```

Khởi động server trước khi chạy browser QA. Playwright không phải dependency bắt buộc của app. Ảnh QA, captures và bản tải xuống chỉ ở `.artifacts`, không đưa vào GitHub hoặc Unity.

## Phạm vi bản 0.1.0

Đã có nhập ảnh, lấy mẫu hex, ánh xạ sáu màu, chỉnh ô, xem trước, seed shuffle, kiểm tra mô hình và xuất JSON. Chưa có crop/vẽ mask thủ công, palette mở rộng, lưu dự án có ảnh nguồn, điều chỉnh độ khó đã playtest hoặc tích hợp Unity. Lời giải mô hình chứng minh một đường hoàn thành theo luật đã khai báo; không chứng minh thời gian người thật, hiệu năng iPhone hoặc runtime khay phụ đã hoàn tất.

Nguồn code riêng của project; không đóng gói level/art của game reference. Private repository, chưa cấp giấy phép phân phối mã nguồn. Không có file font, ảnh hoặc âm thanh production mới.

[Verification record](docs/verification.json) ghi phạm vi kiểm tra và giới hạn bản 0.1.0.
