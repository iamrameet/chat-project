interface UserResponse{
  _id: string;
  username: string;
  name: string;
  createdAt: NativeDate;
  updatedAt: NativeDate;
};

interface ChatCreateResponse{
  isGroup: boolean;
  admins: string[];
  title?: string;
  recentMessage: null | {
    _id: string,
    content: string
  };
  messages?: [];
  createdAt: NativeDate;
  updatedAt: NativeDate;
}

interface GetEndPointResponseMap{
  "/api/user": {
    _id: string,
    name: string,
    username: string
  };
  "/api/user/find": UserResponse;
  "/api/chat/:chatId/messages": {
    _id: string,
    content: string,
    chat: string,
    sender: { _id: string, name: string }
  }[];
  "/api/chat/:chatId": {
    messages: GetEndPointResponseMap["/api/chat/:chatId/messages"],
    _id: string,
    content: string,
    chat: string,
    sender: { _id: string, name: string }
  }[]
}