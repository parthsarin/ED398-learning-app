import React, { FunctionComponent, useState } from 'react';
import { Form } from 'react-bootstrap';
import { QuestionData } from './App';

interface Props {
    question: QuestionData | null
}

const Question: FunctionComponent<Props> = ({ question }) => {
    const [selected, setSelected] = useState<number | null>(null);

    if (!question) return null;

    return (
        <div className="passage-box">
            <p>{ question.prompt }</p>
            <hr />
            <Form>
                {
                    question.answers.map((answer, idx) => (
                        <Form.Check
                            type={'radio'}
                            id={'question-radio'}
                            key={`question-radio-${idx}`}
                            label={answer}
                            checked={idx === selected}
                            onChange={() => setSelected(idx)}
                        />
                    ))
                }
            </Form>
        </div>
    )
}

export default Question;