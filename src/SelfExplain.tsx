import React, { FunctionComponent, useEffect, useMemo, useState } from 'react';
import { Button, Col, Row } from 'react-bootstrap';
import { PassageData, Avatar } from './App';
import Passage from './Passage';
import db, { firebase } from './db';
import { Subject } from "rxjs";
import { debounceTime, distinctUntilChanged } from "rxjs/operators";
import { seEndPrompt, seMiddlePrompt, seStartPrompt } from './prompts';

interface Props {
    passage: PassageData,
    avatar: Avatar,
    advance: () => void,
    containerHeight: number,
    dbInject: any,
}

interface Message {
    text: string,
    bot: boolean,
}

interface MessageProps { 
    message: Message, 
    avatar: Avatar,
    latest: boolean
}

const MessageBox: FunctionComponent<MessageProps> = ({ message, avatar, latest }) => {
    if (message.bot) {
        const julietSize = latest ? 4 : 2;
        return (
            <Row className="mt-2">
                <Col md={julietSize} className="d-flex">
                    <img src={avatar.neutral} alt="" className="my-auto rounded-circle w-100" />
                </Col>
                <Col md={12 - julietSize} className="se-message-box p-2 d-flex">
                    <p className="align-middle my-auto">{message.text}</p>
                </Col>
            </Row>
        );
    } else {
        return (
            <Row className="mt-2">
                <Col md={12} className="se-message-box p-2 d-flex">
                    <p className="align-middle my-auto">{message.text}</p>
                </Col>
            </Row>
        )
    }
}


const SelfExplain: FunctionComponent<Props> = ({ passage, avatar, advance, containerHeight, dbInject }) => {
    const firstMessage = {
        text: "Let's read this passage using self-explanation!",
        bot: true,
    }
    const secondMessage = {
        text: seStartPrompt(),
        bot: true,
    }
    const [history, setHistory] = useState<Message[]>([firstMessage, secondMessage]);
    const [numLines, setNumLines] = useState<number>(2);
    const [response, setResponse] = useState<string>("");

    // Update the content every time they stop typing
    const typeSubject$ = useMemo(() => new Subject<string>(), []);
    useEffect(() => {
        // Every time something is typed, update the state
        const stateSubscriber = typeSubject$.subscribe(
            (val: string) => setResponse(val)
        );

        // Every time they pause for a few seconds, update the database
        const syncStream$ = typeSubject$.pipe(
            debounceTime(1000),
            distinctUntilChanged()
        );
        const dbSubscriber = syncStream$.subscribe(
            (val: string) => {
                db.collection('events').add({
                    ...dbInject,
                    event: "SE_TYPE_MESSAGE",
                    piecesShowing: passage.passage.split(/\n/g).slice(0, numLines),
                    message: val,
                    timestamp: firebase.firestore.Timestamp.now()
                });
            }
        )

        return () => {
            stateSubscriber.unsubscribe();
            dbSubscriber.unsubscribe();
        }
    }, [typeSubject$, passage, dbInject, numLines]);

    const totalLines = passage.passage.split(/\n/g).length;

    // Handle every time the message is sent
    const handleSend = () => {
        if (!response) return;

        // Add the message that was just sent
        const newMessage = {
            text: response,
            bot: false,
        } as Message;
        let historyUpdate: Message[] = [newMessage];

        // Add a bot response if more messages
        const moreMessages = numLines < totalLines;
        if (moreMessages) {
            historyUpdate.push({
                text: seMiddlePrompt(),
                bot: true
            } as Message);
        } else {
            historyUpdate.push({
                text: `${seEndPrompt()} Whenever you're ready, we can take a look at the question!`,
                bot: true,
            } as Message);
        }

        db.collection('events').add({
            ...dbInject,
            event: "SE_SEND_MESSAGE",
            piecesShowing: passage.passage.split(/\n/g).slice(0, numLines),
            message: response,
            timestamp: firebase.firestore.Timestamp.now()
        })

        // Update the state
        setNumLines(numLines + 1);
        setResponse("");
        setHistory([...history, ...historyUpdate]);
    }

    const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

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
                    disabled={numLines < totalLines + 1}
                >
                    Next
                </Button>
            </Col>
            <Col 
                className="" 
                id="se-message-col" 
                md={5}
                style={{
                    height: containerHeight-20,
                    overflowY: "scroll",
                    overflowX: "hidden"
                }}
            >
                <div className="flex-grow-1">
                    {
                        history.map((message, i) => 
                            <MessageBox 
                                key={i} 
                                message={message} 
                                avatar={avatar} 
                                latest={i === history.length - 1} 
                            />
                        )
                    }
                </div>
                <div className="flex-grow-1">
                    <Row className="mt-2 w-100">
                        <Col md={11} className="se-message-box p-0">
                            <textarea 
                                className="se-message-input w-100 h-100 p-2"
                                placeholder="Type your response..."
                                value={response}
                                onChange={(e) => typeSubject$.next(e.target.value)}
                                onKeyDown={handleEnter}
                            ></textarea>
                        </Col>
                        <Col md={1} className="my-auto text-center p-0">
                            <Button
                                aria-label="send message"
                                onClick={handleSend}
                                variant="link"
                                className="se-send-button"
                            >
                                <i 
                                    className="fas fa-arrow-alt-circle-up text-primary h3"
                                    aria-hidden="true"
                                >    
                                </i>
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Col>
        </>
    );
}

export default SelfExplain;