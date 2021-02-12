import React, { Component } from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import Passage from './Passage';

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

interface Question {
  prompt: string,
  answers: string[],
  correct: number
}

interface PassageData {
  passage: string,
  question: Question
}

interface State {
  run: Run,
  step: Step,
  height: number,
  passageIndex: number,
  passages?: { [key in Run]?: PassageData[] },
  error?: string,
  strategy?: Strategy,
  bestStrategy?: Strategy,
}

interface Avatar {
  neutral: string,
  positive: string,
  negative: string,
  height: number,
  width: number,
}

export default class App extends Component<{}, State> {
  avatar: Avatar;

  constructor(props: {}) {
    super(props);

    this.state = {
      run: Run.ASSIGNED_STRATEGY,
      step: Step.INSTRUCTIONS,
      height: 400,
      passageIndex: 0,
    };

    this.avatar = {
      neutral: '/juliet.png',
      positive: '/juliet.png',
      negative: '/juliet.png',
      height: 125,
      width: 100,
    };
  }

  componentDidMount() {
    const rawData = require("./data.json");
    let passages: State['passages'] = {};
    for (let i = 0; i < rawData.length; i++) {
      const run = i as Run;
      const val = rawData[i].map((p: any) => p as PassageData)

      passages[run] = val;
    }

    this.setState({ passages });
  }

  calcNextStep = (): Step => {
    const curr = this.state.step;

    switch (curr) {
      case Step.INSTRUCTIONS:
        if (this.state.run === Run.ASSIGNED_STRATEGY) {
          this.setState({ strategy: Strategy.NO_MECH }); // start with no mech
        }
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
              // run 1 
                // toggle strategy
                // -> Step.PASSAGE
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
          this.setState({ 'error': "We haven't picked a strategy!" })
          return Step.PASSAGE;
        }
    }
  }

  buildAvatarBottomLeft = (scale: number = 1) => (
    <img
      style={
        {
          height: this.avatar.height * scale,
          width: this.avatar.width * scale,
        }
      }
      src={this.avatar.neutral}
      alt=""
    />
  )

  buildLargeMessageBox = (message: string, style: any = {}) => (
    <div className="message-box d-flex" style={
      {
        'position': 'relative',
        'height': this.state.height - this.avatar.height - 40,
        'width': "100%",
        'bottom': this.avatar.height,
        ...style
      }
    }>
      <p className="align-self-center">{ message }</p>
    </div>
  )

  buildAdvanceButton = (text: string = "Next") => (
    <Button 
      variant="primary"
      onClick={() => this.setState({ step: this.calcNextStep() })}
      className="float-right"
    >
      { text }
    </Button>
  )

  buildInstructions() {
    const message: string = `Welcome to the Learning Mechanic Learning App! 
    We're going to read passages of text from Shakespeare and then you'll help 
    me answer comprehension questions about the passage. First, we'll learn a 
    studying strategy called "self-explanation" and then later, we'll get to
    choose whether we want to use it or not or not.`;
    return (
      <>
        <Col md={1} className="align-self-end">
          { this.buildAvatarBottomLeft() }
        </Col>
        <Col md={10} className="align-self-end">
          { this.buildLargeMessageBox(message) }
        </Col>
        <Col md={1} className="align-self-end">
          { this.buildAdvanceButton() }
        </Col>
      </>
    );
  }

  buildPassage = () => (
    <>
      <Col className="" md={8}>
        <Passage
          passage={
            this.state.passages
              ? this.state.passages[this.state.run]![this.state.passageIndex].passage
              : ""
          }
        />
      </Col>
      <Col className="align-self-end" md={1}>
        {this.buildAdvanceButton()}
      </Col>
      <Col className="align-self-end" md={3}>
        { 
          this.buildLargeMessageBox(
            "Let's read the passage!",
            { bottom: 0, width: "80%", left: 50 }
          ) 
        }
        { this.buildAvatarBottomLeft(0.8) }
      </Col>
    </>
  )

  render() {
    let component: JSX.Element | null = null;
    switch (this.state.step) {
      case Step.INSTRUCTIONS:
        component = this.buildInstructions();
        break;
      case Step.PASSAGE:
        component = this.buildPassage();
        break;
      case Step.QUESTION:
        break;
      case Step.FEEDBACK:
        break;
      case Step.PICK_STRATEGY:
        break;
    }

    return (
      <Container className="mt-2">
        <Row id="app-border" style={
          {
            'height': this.state.height,
          }
        }>
          {component}
        </Row>
      </Container>
    );
  }
}