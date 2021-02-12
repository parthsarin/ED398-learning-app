import React, { Component, CSSProperties } from 'react';
import { Container } from 'react-bootstrap';

enum Step {
  INSTRUCTIONS = 0,
  PASSAGE,
  QUESTION,
  FEEDBACK,
  PICK_STRATEGY
}

enum Strategy {
  NO_MECH = 0,
  SELF_EXPLAIN
}

enum Run {
  ASSIGNED_STRATEGY = 0,
  PICK_STRATEGY
}

interface State {
  run: Run,
  step: Step,
  height: number,
  width: number,
  strategy?: Strategy,
  bestStrategy?: Strategy,
}

interface Avatar {
  src: string,
  height: number,
  width: number,
  style?: CSSProperties
}

export default class App extends Component<{}, State> {
  avatar: Avatar;

  constructor(props: {}) {
    super(props);

    this.state = {
      run: Run.ASSIGNED_STRATEGY,
      step: Step.INSTRUCTIONS,
      height: 400,
      width: 1100,
    };

    this.avatar = {
      src: '/logo512.png',
      height: 100,
      width: 100,
      style: {
        'height': 100,
        'width': 100,
        'position': 'relative',
      }
    };
  }

  calcNextStep = (): Step | string => {
    const curr = this.state.step;

    switch (curr) {
      case Step.INSTRUCTIONS:
        return Step.PASSAGE;
      case Step.PASSAGE:
        return Step.QUESTION;
      case Step.QUESTION:
        // grade question
        // check if we're out of questions for this run
          // if yes 
            // get next passage, question, answer -> state
            // return -> Step.Feedback
          // if no 
            // which run are we on?
              // run 1 -> Step.PASSAGE
              // run 2 -> Step.PICK_STRATEGY
        return Step.PASSAGE;
      case Step.FEEDBACK:
        // Increment the run counter and nullify strategy
        this.setState({ run: this.state.run + 1, strategy: undefined });
        // Get next passage, question, answer -> state
        return Step.PICK_STRATEGY;
      case Step.PICK_STRATEGY:
        if (this.state.strategy) {
          // Get next passage, question, answer -> state
          return Step.PASSAGE;
        } else {
          // Error: no strategy has been picked
          return "No strategy has been picked.";
        }
    }
  }

  buildAvatarBottomLeft = () => (
    <img
      style={
        {
          ...this.avatar.style,
          'top': this.state.height - this.avatar.height - 20,
        }
      }
      src={this.avatar.src}
      alt=""
    />
  )

  buildLargeMessageBox = (message: string) => (
    <div className="message-box d-flex" style={
      {
        'position': 'relative',
        'height': this.state.height - this.avatar.height - 40,
        'width': this.state.width - this.avatar.width - 80,
        'bottom': this.avatar.height - 20,
        'left': this.avatar.width
      }
    }>
      <p className="align-self-center">{ message }</p>
    </div>
  )

  buildInstructions() {
    const message: string = `Welcome to the Learning Mechanic Learning App! 
    We're going to read passages of text from Shakespeare and then you'll help 
    me answer comprehension questions about the passage. First, we'll learn a 
    studying strategy called "self-explanation" and then later, we'll get to
    choose whether we want to use it or not or not.`;
    return (
      <>
        { this.buildAvatarBottomLeft() }
        { this.buildLargeMessageBox(message) }
      </>
    );
  }

  render() {
    let component: JSX.Element | null = null;
    if (this.state.step === Step.INSTRUCTIONS) {
      component = this.buildInstructions();
    }

    return (
      <Container className="mt-2">
        <div id="app-border" style={
          {'height': this.state.height, 'width': this.state.width}
        }>
          {component}
        </div>
      </Container>
    );
  }
}