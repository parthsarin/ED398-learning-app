import React, { FunctionComponent, useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { PassageData, Avatar } from './App';
import Passage from './Passage';

interface Props {
    passage: PassageData,
    avatar: Avatar,
    advance: () => void,
}

interface Message {
    text: string,
    bot: boolean,
}

interface MessageProps { 
    message: Message, 
    avatar: Avatar 
}

const MessageBox: FunctionComponent<MessageProps> = ({ message, avatar }) => {
    if (message.bot) {
        return (
            <Row className="mt-2">
                <Col md={2}>
                    <img src={avatar.neutral} className="rounded-circle w-100" />
                </Col>
                <Col md={10} className="se-message-box">
                    <span className="align-middle">{message.text}</span>
                </Col>
            </Row>
        );
    } else {
        return (
            <Row className="mt-2">
                <Col md={12} className="se-message-box">
                    <span className="align-middle">{message.text}</span>
                </Col>
            </Row>
        )
    }

    return null;
}


const SelfExplain: FunctionComponent<Props> = ({ passage, avatar, advance }) => {
    const firstMessage = {
        text: "Hmm. I don't understand how those two sentences connect... Can you explain?",
        bot: true,
    }
    const [history, setHistory] = useState<Message[]>([firstMessage]);
    const [numLines, setNumLines] = useState<number>(2);
    const totalLines = passage.passage.split(/\n/g).length;

    return (
        <>
            <Col className="" md={6}>
                <Passage
                    passage={passage.passage}
                    displayUpTo={numLines}
                />
            </Col>
            <Col className="align-self-end" md={1}>
                <Button
                    variant="primary"
                    onClick={advance}
                    className="float-right"
                    disabled={numLines < totalLines}
                >
                    Next
                </Button>
            </Col>
            <Col className="h-100 border-left align-self-end" md={5}>
                {
                    history.map(message => 
                        <MessageBox message={message} avatar={avatar} />
                    )
                }
                <Row className="mt-2">
                    <Col md={10} className="se-message-box p-0">
                        <textarea className="se-message-input w-100 h-100"></textarea>
                    </Col>
                    <Col md={2} className="my-auto text-center">
                        <i className="fas fa-arrow-alt-circle-up text-primary h2"></i>
                    </Col>
                </Row>
            </Col>
        </>
    );
}

export default SelfExplain;