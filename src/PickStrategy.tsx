import React, { FunctionComponent, useState } from 'react';
import { Col, Row } from 'react-bootstrap';
import { Avatar, Strategy } from './App';

interface Props {
    bestStrategy?: Strategy,
    avatar: Avatar,
    height: number,
    advance: () => void,
    selectStrategy: (s: Strategy) => void,
}

const PickStrategy: FunctionComponent<Props> = 
    ({ bestStrategy, avatar, height, advance, selectStrategy }) => {
    const [strategy, setStrategy] = useState<Strategy | null>(null);

    const handleSubmit = (s: Strategy) => {
        setStrategy(s);
        selectStrategy(s);
    }

    if (strategy !== null) {
        const positive = (bestStrategy === undefined) || (strategy === bestStrategy);
        const message = positive ? "Yay! That sounds fun!" : "Oh. Okay. I guess we can do that.";

        setTimeout(advance, 2500);

        return (
            <>
                <Col md={4} className="align-self-end">
                    <img
                        style={
                            {
                                height: avatar.height * 2.5,
                                width: avatar.width * 2.5,
                            }
                        }
                        src={positive ? avatar.positive : avatar.negative}
                        className="mx-auto d-block"
                        alt=""
                    />
                </Col>
                <Col md={8} className="align-self-end">
                    <div className="message-box d-flex" style={
                        {
                            'position': 'relative',
                            'height': height - avatar.height - 40,
                            'width': "100%",
                            'bottom': avatar.height
                        }
                    }>
                        <p className="align-self-center">{message}</p>
                    </div>
                </Col>
            </>
        );
    } else {
        return (
            <>
                <Col md={1} className="align-self-end">
                    <img
                        style={
                            {
                                height: avatar.height,
                                width: avatar.width,
                            }
                        }
                        src={avatar.neutral}
                        alt=""
                    />
                </Col>
                <Col md={11} className="align-self-end">
                    <div className="message-box d-flex" style={
                        {
                            'position': 'relative',
                            'height': height - avatar.height - 40,
                            'width': "100%",
                            'bottom': avatar.height,
                        }
                    }>
                        <Col>
                            <Row>
                                <p>Pick a strategy to use for the next question</p>
                            </Row>
                            <Row style={{height: "70%"}}>
                                <Col md={6}>
                                    <div 
                                        className="border rounded border-secondary m-2 h-100 d-flex" 
                                        style={{cursor: "pointer", textAlign: "center"}}
                                        onClick={() => handleSubmit(Strategy.NO_MECH)}
                                    >
                                        <p>No Mechanic</p>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div 
                                        className="border rounded border-secondary m-2 h-100 d-flex" 
                                        style={{cursor: "pointer", textAlign: "center"}}
                                        onClick={() => handleSubmit(Strategy.SELF_EXPLAIN)}
                                    >
                                        <p>Self-Explanation</p>
                                    </div>
                                </Col>
                            </Row>
                        </Col>
                    </div>
                </Col>
            </>
        );
    }

}

export default PickStrategy;