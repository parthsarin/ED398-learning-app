import React, { Component } from 'react';
import { Button, Col, Container, Row } from 'react-bootstrap';
import Passage from './Passage';
import PickStrategy from './PickStrategy';
import Question from './Question';
import SelfExplain from './SelfExplain';

enum Step {
  INSTRUCTIONS = 0,
  PASSAGE,
  QUESTION,
  FEEDBACK,
  PICK_STRATEGY,
  FINAL
}

enum Strategy {
  NO_MECH = 0,
  SELF_EXPLAIN
}

enum Run {
  ASSIGNED_STRATEGY = 0,
  PICK_STRATEGY
}

interface QuestionData {
  prompt: string,
  answers: string[],
  correct: number
}

interface PassageData {
  passage: string,
  question: QuestionData
}

interface State {
  run: Run,
  step: Step,
  height: number,
  passageIndex: number,
  passages?: { [key in Run]?: PassageData[] },
  currPassage?: PassageData,
  error?: string,

  // Strategy
  strategy?: Strategy,
  bestStrategy?: Strategy,

  // Answer
  selectedAnswer: number | null,
  numCorrect: { [r in Run]?: { [s in Strategy]?: number } },
  numTotalSecondRun: { [s in Strategy]?: number },
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
      height: 600,
      passageIndex: 0,
      selectedAnswer: null,
      numCorrect: {},
      numTotalSecondRun: {},
    };

    this.avatar = {
      neutral: `${process.env.PUBLIC_URL}/neutral.png`,
      positive: `${process.env.PUBLIC_URL}/positive.png`,
      negative: `${process.env.PUBLIC_URL}/negative.png`,
      height: 125,
      width: 125,
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

  getNextQuestion = (): any => {
    const currRun = this.state.run;
    const currPassageIdx = this.state.passageIndex;
    const currStrategy = this.state.strategy!;

    const nextPassage = this.state.passages![currRun]![currPassageIdx+1];

    if (!nextPassage) {
      return false;
    } else {
      return {
        passageIndex: currPassageIdx + 1,
        currPassage: nextPassage,
        error: "",
        selectedAnswer: null,
        strategy: 
          this.state.run === Run.ASSIGNED_STRATEGY 
            ? 1 - currStrategy as Run // toggle the strategy
            : undefined // let the user pick the strategy
      }
    }
  }

  calcNewGrade = (): State['numCorrect'] => {
    // Current variables
    const currPassage = this.state.currPassage!;
    const currAnswer = this.state.selectedAnswer;

    // Copy data from the state
    let numCorrect = Object.assign({}, this.state.numCorrect);
    if (!(this.state.run in numCorrect)) {
      numCorrect[this.state.run] = {};
    } else {
      numCorrect[this.state.run] = Object.assign({}, this.state.numCorrect[this.state.run]);
    }

    if (!(this.state.strategy! in numCorrect[this.state.run]!)) {
      numCorrect[this.state.run]![this.state.strategy!] = 0;
    } else {
      numCorrect[this.state.run]![this.state.strategy!]
        = this.state.numCorrect[this.state.run]![this.state.strategy!]!;
    }

    const corrInRun = numCorrect[this.state.run]![this.state.strategy!]!;
    var correct = currAnswer === currPassage.question.correct ? 1 : 0;

    return {
      ...numCorrect,
      [this.state.run]: {
        ...numCorrect[this.state.run]!,
        [this.state.strategy!]: corrInRun + correct,
      }
    };
  }

  calcNextStep = (): Step => {
    const curr = this.state.step;

    switch (curr) {
      case Step.INSTRUCTIONS:
        if (this.state.run === Run.ASSIGNED_STRATEGY) {
          this.setState({ 
            strategy: Strategy.NO_MECH, // start with no mech
            currPassage: this.state.passages![this.state.run]![this.state.passageIndex]
          }); 
        }

        if (this.state.passages) {
          return Step.PASSAGE;
        } else {
          // Nowhere to go...!
          return Step.INSTRUCTIONS;
        }

      case Step.PASSAGE:
        return Step.QUESTION;

      case Step.QUESTION:
        // Did they select an answer?
        if (this.state.selectedAnswer === null) {
          // They never selected an answer
          this.setState({ error: "Hmm. We haven't selected an answer." });
          return Step.QUESTION;
        }
          
        // Grade the current question
        const newGrade = this.calcNewGrade();
        this.setState({ numCorrect: newGrade });
        
        // Get the next question
        const stateUpdate = this.getNextQuestion();
        if (stateUpdate) {
          // There are questions left
          this.setState({ ...stateUpdate });
          return Step.PASSAGE;
        } 

        // We're out of questions
        this.setState({
          selectedAnswer: null,
          error: "",
          currPassage: undefined,
          strategy: undefined,
          passageIndex: -1,
        })

        if (this.state.run === Run.ASSIGNED_STRATEGY) {
          // Compute the better strategy
          const numCorrect = newGrade[Run.ASSIGNED_STRATEGY]!;
          const total = this.state.passages![Run.ASSIGNED_STRATEGY]!.length;

          const numNoStrat = numCorrect[Strategy.NO_MECH]!;
          const totalNoStrat = Math.ceil(total / 2);

          const numSelfExp = numCorrect[Strategy.SELF_EXPLAIN]!;
          const totalSelfExp = Math.floor(total / 2);

          if (numNoStrat / totalNoStrat > numSelfExp / totalSelfExp) {
            // no strat was better
            this.setState({ bestStrategy: Strategy.NO_MECH });
          }
          else if (numNoStrat / totalNoStrat < numSelfExp / totalSelfExp) {
            // self exp was better
            this.setState({ bestStrategy: Strategy.SELF_EXPLAIN });
          }
          else {
            // the two strategies were equivalent
            this.setState({ bestStrategy: undefined });
          }
          return Step.FEEDBACK;
        }

        // Bye bye!
        return Step.FINAL;

      case Step.FEEDBACK:
        // Increment the run counter and nullify strategy
        const nextRun = this.state.run + 1 as Run;
        this.setState({ 
          run: nextRun, 
          strategy: undefined,
          passageIndex: 0,
          currPassage: this.state.passages![nextRun]![0],
          error: "",
          selectedAnswer: null
        });

        return Step.PICK_STRATEGY;
      case Step.PICK_STRATEGY:
        if (this.state.strategy !== undefined) {
          const query = this.state.numTotalSecondRun[this.state.strategy];
          const newTotal = query ? query + 1 : 1;

          this.setState({
            numTotalSecondRun: {
              ...this.state.numTotalSecondRun,
              [this.state.strategy]: newTotal
            }
          });
          return Step.PASSAGE;
        } else {
          // Error: no strategy has been picked
          this.setState({ 'error': "We haven't picked a strategy!" })
          return Step.PICK_STRATEGY;
        }
      case Step.FINAL:
        return Step.FINAL;
    }
  }

  buildAvatarBottomLeft = (scale: number = 1, srcSub: string = "") => (
    <img
      style={
        {
          height: this.avatar.height * scale,
          width: this.avatar.width * scale,
        }
      }
      src={srcSub ? srcSub : this.avatar.neutral}
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
    We're going to read passages about science and then you'll help 
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

  buildFeedback() {
    const numCorrect = this.state.numCorrect[Run.ASSIGNED_STRATEGY]!;
    const total = this.state.passages![Run.ASSIGNED_STRATEGY]!.length;

    const numNoStrat = numCorrect[Strategy.NO_MECH]!;
    const totalNoStrat = Math.ceil(total / 2);

    const numSelfExp = numCorrect[Strategy.SELF_EXPLAIN]!;
    const totalSelfExp = Math.floor(total / 2);

    const message: string = `That was fun! We got ${numNoStrat} of 
    ${totalNoStrat} correct when we weren't self-explaining and ${numSelfExp}
    of ${totalSelfExp} when we were using self-explanation.`;

    // Compute the better strategy
    let betterStrat: string = "";
    switch (this.state.bestStrategy) {
      case undefined:
        betterStrat = "The two studying strategies worked equally well!";
        break;

      case Strategy.SELF_EXPLAIN:
        betterStrat = "Self-explanation was better!";
        break;

      case Strategy.NO_MECH:
        betterStrat = "Not self-explaining was better!";
        break;
    }

    return (
      <>
        <Col md={1} className="align-self-end">
          {this.buildAvatarBottomLeft()}
        </Col>
        <Col md={10} className="align-self-end">
          <div className="message-box d-flex" style={
            {
              'position': 'relative',
              'height': this.state.height - this.avatar.height - 40,
              'width': "100%",
              'bottom': this.avatar.height,
            }
          }>
            <p className="align-self-center">
              {message}<br />
              <b>{betterStrat}</b>
            </p>
          </div>
        </Col>
        <Col md={1} className="align-self-end">
          {this.buildAdvanceButton()}
        </Col>
      </>
    );
  }

  buildPassage = () => {
    if (this.state.strategy === Strategy.NO_MECH) {
      return (
        <>
          <Col className="" md={8}>
            <Passage
              passage={
                this.state.currPassage
                  ? this.state.currPassage.passage
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
                { bottom: 0, width: "80%", left: 50, marginBottom: 10 }
              ) 
            }
            { this.buildAvatarBottomLeft(0.8) }
          </Col>
        </>
      );
    } else { // if (this.state.strategy === Strategy.SELF_EXPLAIN)
      return (
        <SelfExplain 
          passage={this.state.currPassage!} 
          avatar={this.avatar}
          advance={() => this.setState({ step: this.calcNextStep() })}
          containerHeight={this.state.height}
        />
      );
    }
  }

  buildQuestion = () => (
    <>
      <Col className="" md={8}>
        <Question
          question={
            this.state.currPassage
              ? this.state.currPassage.question
              : null
          }
          selected={this.state.selectedAnswer}
          onChange={(selectedAnswer: number) => this.setState({ selectedAnswer })}
        />
      </Col>
      <Col className="align-self-end" md={1}>
        {this.buildAdvanceButton("Submit")}
      </Col>
      <Col className="align-self-end" md={3}>
        {
          this.buildLargeMessageBox(
            this.state.error ? this.state.error : "Can you help me answer this question?",
            { bottom: 0, width: "80%", left: 50, marginBottom: 10 }
          )
        }
        {this.buildAvatarBottomLeft(0.8)}
      </Col>
    </>
  )

  buildPickStrategy = () => (
    <PickStrategy
      bestStrategy={this.state.bestStrategy}
      avatar={this.avatar}
      height={this.state.height}
      advance={() => this.setState({ step: this.calcNextStep() })}
      selectStrategy={(strategy: Strategy) => this.setState({ strategy })}
    />
  )

  buildFinalStep = () => {
    const runOneTotals = {
      SECorrect: this.state.numCorrect[Run.ASSIGNED_STRATEGY]![Strategy.SELF_EXPLAIN],
      SETotal: Math.floor(this.state.passages![Run.ASSIGNED_STRATEGY]!.length / 2),
      NMCorrect: this.state.numCorrect[Run.ASSIGNED_STRATEGY]![Strategy.NO_MECH],
      NMTotal: Math.ceil(this.state.passages![Run.ASSIGNED_STRATEGY]!.length / 2),
    }

    const numOrZero = (n: any) => n ? n : 0;
    const runTwoTotals = {
      SECorrect: numOrZero(this.state.numCorrect[Run.PICK_STRATEGY]![Strategy.SELF_EXPLAIN]),
      SETotal: numOrZero(this.state.numTotalSecondRun[Strategy.SELF_EXPLAIN]),
      NMCorrect: numOrZero(this.state.numCorrect[Run.PICK_STRATEGY]![Strategy.NO_MECH]),
      NMTotal: numOrZero(this.state.numTotalSecondRun[Strategy.NO_MECH]),
    }

    return (
      <>
        <Col md={2} className="align-self-end">
          {this.buildAvatarBottomLeft(1.5, this.avatar.positive)}
        </Col>
        <Col md={10} className="align-self-end">
          <div className="message-box d-flex" style={
            {
              'position': 'relative',
              'height': this.state.height - this.avatar.height - 40,
              'width': "100%",
              'bottom': this.avatar.height,
            }
          }>
            <p className="align-self-center">
              As a reminder, during the first run, we got {runOneTotals.NMCorrect} of {runOneTotals.NMTotal} correct without using self-explanation and {runOneTotals.SECorrect} of {runOneTotals.SETotal} when we were using self-explanation.<br />
              During the second run, we got {runTwoTotals.NMCorrect} of {runTwoTotals.NMTotal} correct without using self-explanation and {runTwoTotals.SECorrect} of {runTwoTotals.SETotal} when we were using self-explanation!<br />
              Thanks for participating! Did the emotional manipulation feel like torture?
            </p>
          </div>
        </Col>
      </>
    );
  }

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
        component = this.buildQuestion();
        break;
      case Step.FEEDBACK:
        component = this.buildFeedback();
        break;
      case Step.PICK_STRATEGY:
        const ComponentClass = this.buildPickStrategy;
        component = <ComponentClass />;
        break;
      case Step.FINAL:
        component = this.buildFinalStep();
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

export { Strategy };
export type { QuestionData, PassageData, Avatar };