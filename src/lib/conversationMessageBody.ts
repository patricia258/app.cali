const attachmentPattern = /\[\[arquivo\|([^|]+)\|([^|]+)\|([^|]+)\|(\d+)\]\]/g;

export type ConversationMessageAttachment = { name: string; path: string; size: number; token: string };

export function readConversationMessageBody(body: string) {
  const attachments: ConversationMessageAttachment[] = [];
  const text = body.replace(attachmentPattern, (token, name: string, path: string, _type: string, size: string) => {
    try {
      attachments.push({ name: decodeURIComponent(name), path: decodeURIComponent(path), size: Number(size), token });
    } catch {
      attachments.push({ name, path, size: Number(size), token });
    }
    return '';
  }).trim();
  return { attachments, text };
}

export function conversationAttachmentToken(path: string, file: File) {
  return `[[arquivo|${encodeURIComponent(file.name)}|${encodeURIComponent(path)}|${encodeURIComponent(file.type)}|${file.size}]]`;
}
