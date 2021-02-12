import React, { FunctionComponent, useState } from 'react';

enum User {
    AVATAR = 0,
    USER,
}

interface Message {
    text: string,
    user: User,
}

const Chat: FunctionComponent<{}> = () => {
    const [history, setHistory] = useState<Message[]>([]);

    return null;
}

export default Chat;