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
