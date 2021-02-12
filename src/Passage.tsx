import React, { FunctionComponent } from 'react';

interface Props {
    passage: string,
    displayUpTo?: number,
}

const Passage: FunctionComponent<Props> = ({ passage, displayUpTo }) => {
    let displayText = passage;
    if (displayUpTo) {
        const pieces = passage.split(/(?<=\.*[?\.!] )/g);;
        const displayChunks = pieces.slice(0, displayUpTo);

        displayText = displayChunks.join("");
    }

    return (
        <div className="passage-box">
            <p>{ displayText }</p>
        </div>
    );
}

export default Passage;