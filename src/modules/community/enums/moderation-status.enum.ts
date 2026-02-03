export enum ModerationStatus {
  PENDING = 'pending',     // 검토 대기
  APPROVED = 'approved',   // 승인됨
  REJECTED = 'rejected',   // 거부됨
  FLAGGED = 'flagged',     // 신고됨
  REMOVED = 'removed',     // 삭제됨
}
