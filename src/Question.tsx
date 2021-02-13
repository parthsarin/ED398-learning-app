import React, { FunctionComponent } from 'react';
import { QuestionData } from './App';

interface Props {
    question: QuestionData | null,
    selected: number | null,
    onChange: (selected: number) => void,
}

const Question: FunctionComponent<Props> = ({ question, selected, onChange }) => {
    if (!question) return null;

    return (
        <div className="passage-box">
            <p>{ question.prompt }</p>
            <hr />
            <form>
                {
                    question.answers.map((answer, idx) => (
                        <div className="answer-radio-group" key={`answer-${idx}`}>
                            <input
                                type={'radio'}
                                id={`question-radio-${idx}`}
                                name={'answer'}
                                value={idx}
                                key={`question-radio-${idx}`}
                                checked={idx === selected}
                                onChange={() => onChange(idx)}
                            />
                            <label htmlFor={`question-radio-${idx}`}>
                                {answer}
                            </label>
                        </div>
                    ))
                }
            </form>
        </div>
    )
}

export default Question;