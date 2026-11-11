import createClient from "openapi-fetch";
import type { components, paths } from "./schema";

/**
 * Client gọi BE. Luôn qua đường dẫn tương đối /api (Next.js rewrite sang BE), nên trình duyệt tự gửi
 * cookie phiên đăng nhập (httpOnly, cùng domain). FE không đọc, không lưu token nào.
 * Type sinh từ OpenAPI của BE: chạy `pnpm gen:api` khi BE đổi API.
 */
export const api = createClient<paths>({ baseUrl: "/api" });

export type Schemas = components["schemas"];
export type Me = Schemas["MeResponse"];
export type TenantSettings = Schemas["TenantSettingsResponse"];
export type Industry = Schemas["IndustryResponse"];
export type KnowledgeItem = Schemas["KnowledgeItemResponse"];
export type KnowledgeImport = Schemas["KnowledgeImportResponse"];
export type KnowledgeImportSummary = Schemas["KnowledgeImportSummaryResponse"];
export type KnowledgeDiffItem = Schemas["KnowledgeDiffItemResponse"];
export type KnowledgeDocument = Schemas["KnowledgeDocumentResponse"];
export type KnowledgeSearchResult = Schemas["KnowledgeSearchResult"];
export type KnowledgeStatus = Schemas["KnowledgeStatusResponse"];
export type ChatConversation = Schemas["ChatTestConversationResponse"];
export type ChatConversationSummary = Schemas["ChatTestConversationSummary"];
export type ChatMessage = Schemas["ChatMessageResponse"];
export type ChatTrace = Schemas["ChatTraceResponse"];
export type ChatTraceChunk = Schemas["ChatTraceChunkResponse"];
export type ChannelsInfo = Schemas["ChannelsResponse"];
export type ChannelConnection = Schemas["ChannelConnectionResponse"];
export type InboxItem = Schemas["InboxConversationItem"];
export type InboxDetail = Schemas["InboxConversationDetail"];
export type InboxMessage = Schemas["InboxMessage"];
export type TenantMember = Schemas["TenantMemberResponse"];
export type HandoffSettings = Schemas["HandoffSettingsResponse"];
export type ContactItem = Schemas["ContactListItem"];
export type ContactList = Schemas["ContactListResponse"];
export type ContactDetail = Schemas["ContactDetail"];
export type ContactNote = Schemas["ContactNoteItem"];
export type CareSuggestion = Schemas["CareSuggestionItem"];
export type TelegramLinkCode = Schemas["TelegramLinkCodeResponse"];
export type Dashboard = Schemas["DashboardResponse"];
export type UnansweredQuestion = Schemas["UnansweredQuestion"];
export type AdminTenant = Schemas["AdminTenantItem"];
export type AdminTenantDetail = Schemas["AdminTenantDetail"];
export type Plan = Schemas["PlanResponse"];
export type Branch = Schemas["BranchResponse"];
export type BranchDetail = Schemas["BranchDetailResponse"];
export type BranchHour = Schemas["BranchHourItem"];
export type BranchClosure = Schemas["BranchClosureItem"];
export type CatalogItem = Schemas["CatalogItemResponse"];
export type CatalogItemDetail = Schemas["CatalogItemDetailResponse"];
export type StaffMember = Schemas["StaffResponse"];
export type StaffDetail = Schemas["StaffDetailResponse"];
export type ShiftTemplate = Schemas["ShiftTemplateItem"];
export type TimeOff = Schemas["TimeOffItem"];
export type CrmSettings = Schemas["CrmSettingsResponse"];
export type TeamMember = Schemas["TeamMemberResponse"];
export type Appointment = Schemas["AppointmentResponse"];
export type AppointmentDetail = Schemas["AppointmentDetailResponse"];
export type AppointmentEvent = Schemas["AppointmentEventResponse"];
export type AppointmentItem = Schemas["AppointmentItemResponse"];
export type AvailableSlot = Schemas["AvailableSlotResponse"];
export type SeriesOutcome = Schemas["SeriesOutcomeResponse"];
export type Resource = Schemas["ResourceResponse"];
export type WaitlistEntry = Schemas["WaitlistResponse"];
// Bán hàng (C3)
export type InvoiceSummary = Schemas["InvoiceSummaryResponse"];
export type Invoice = Schemas["InvoiceResponse"];
export type InvoiceLine = Schemas["InvoiceLineResponse"];
export type InvoiceLineRequest = Schemas["InvoiceLineRequest"];
export type Payment = Schemas["PaymentResponse"];
export type TransferQr = Schemas["TransferQrResponse"];
export type Receipt = Schemas["ReceiptResponse"];
export type CustomerPackage = Schemas["CustomerPackageResponse"];
export type PackageRedemption = Schemas["PackageRedemptionResponse"];
export type Wallet = Schemas["WalletResponse"];
export type WalletTransaction = Schemas["WalletTransactionResponse"];
export type Voucher = Schemas["VoucherResponse"];
export type SaveVoucherRequest = Schemas["SaveVoucherRequest"];
export type CashShift = Schemas["CashShiftResponse"];
export type BankAccount = Schemas["BankAccountResponse"];
// Kho hàng (C4)
export type StockLevel = Schemas["StockLevelResponse"];
export type StockMovement = Schemas["StockMovementResponse"];
export type Supplier = Schemas["SupplierResponse"];
export type PurchaseOrder = Schemas["PurchaseOrderResponse"];
export type StockCount = Schemas["StockCountResponse"];
export type Consumable = Schemas["ConsumableResponse"];
