type SessionRecord = {
  id: string;
  provider: string;
  updatedAt: number;
};

const sessions = new Map<string, SessionRecord>();

export const upsertSession = (session: SessionRecord): void => {
  sessions.set(session.id, session);
};

export const getSession = (id: string): SessionRecord | undefined => {
  return sessions.get(id);
};
