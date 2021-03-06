import React, { Component } from 'react';
import { Alert, Button, Col, Container, Row } from 'react-bootstrap';
import { v4 as uuid } from 'uuid';
import Passage from './Passage';
import PickStrategy from './PickStrategy';
import Question from './Question';
import SelfExplain from './SelfExplain';
import db, { firebase } from './db';

enum Step {
  STUDY_METADATA = 0,
  INSTRUCTIONS,
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

enum Condition {
  NO_REWARD = 0,
  REWARD
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

  // Metadata
  name: string,
  condition: Condition | null,

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
  unique_id: string;

  constructor(props: {}) {
    super(props);

    this.state = {
      run: Run.ASSIGNED_STRATEGY,
      step: Step.STUDY_METADATA,
      name: "",
      condition: null,
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

    this.unique_id = uuid();
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

    // Session begins
    db.collection('events').add({
      session: this.unique_id,
      event: "SESSION_START",
      timestamp: firebase.firestore.Timestamp.now(),
    });
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

    db.collection('events').add({
      session: this.unique_id,
      event: "QUESTION_SUBMIT",
      name: this.state.name,
      passage: currPassage.passage,
      question: currPassage.question.prompt,
      choices: currPassage.question.answers,
      selected_answer: currAnswer,
      correct_answer: currPassage.question.correct,
      run: this.state.run,
      strategy: this.state.strategy,
      bestStrategy: this.state.bestStrategy ? this.state.bestStrategy : null,
      correct: correct,
      timestamp: firebase.firestore.Timestamp.now()
    });

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
      case Step.STUDY_METADATA:
        if (!this.state.name) {
          this.setState({ error: "Please enter your name." });
          return Step.STUDY_METADATA;
        }

        if (this.state.condition === null) {
          this.setState({ error: "Please select a condition." });
          return Step.STUDY_METADATA;
        }

        this.setState({ error: "" })
        return Step.INSTRUCTIONS;
      
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

          if (this.state.run === Run.ASSIGNED_STRATEGY) {
            return Step.PASSAGE;
          } else {
            return Step.PICK_STRATEGY;
          }
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

          let bestStrategy: Strategy | undefined = undefined;
          if (numNoStrat / totalNoStrat > numSelfExp / totalSelfExp) {
            // no strat was better
            bestStrategy = Strategy.NO_MECH;
          }
          else if (numNoStrat / totalNoStrat < numSelfExp / totalSelfExp) {
            // self exp was better
            bestStrategy = Strategy.SELF_EXPLAIN;
          }
          else {
            // the two strategies were equivalent
            bestStrategy = undefined;
          }
          this.setState({ bestStrategy });

          db.collection('events').add({
            session: this.unique_id,
            event: "HALFWAY_FEEDBACK",
            name: this.state.name,
            numNoStrat,
            totalNoStrat,
            numSelfExp,
            totalSelfExp,
            bestStrategy: bestStrategy ? bestStrategy : null,
            timestamp: firebase.firestore.Timestamp.now()
          })

          return Step.FEEDBACK;
        }

        // Bye bye!
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

        db.collection('events').add({
          session: this.unique_id,
          event: "FINAL_RESULTS",
          name: this.state.name,
          runOneTotals,
          runTwoTotals,
          bestStrategy: this.state.bestStrategy ? this.state.bestStrategy : null,
          timestamp: firebase.firestore.Timestamp.now()
        })

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

  stepAdvancePersist = () => {
    const nextStep = this.calcNextStep();

    let event = "";
    if (nextStep === this.state.step) {
      event = "ERROR";
    } else {
      event = "STEP_ADVANCE";
    }

    db.collection('events').add({
      session: this.unique_id,
      event: event,
      name: this.state.name,
      error: this.state.error ? this.state.error : null,
      condition: this.state.condition,
      curr_step: this.state.step,
      next_step: nextStep,
      strategy: this.state.strategy ? this.state.strategy : null,
      timestamp: firebase.firestore.Timestamp.now(),
    });

    this.setState({ step: nextStep });
  }

  buildAdvanceButton = (text: string = "Next") => {
    return (
      <Button 
        variant="primary"
        onClick={this.stepAdvancePersist}
        className="float-right"
      >
        { text }
      </Button>
    );
  }

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
          <Col className="" md={7}>
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
          <Col className="align-self-end" md={4}>
            { 
              this.buildLargeMessageBox(
                "Let's read this passage without using self-explanation!",
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
          advance={this.stepAdvancePersist}
          containerHeight={this.state.height}
          dbInject={{
            session: this.unique_id,
            name: this.state.name,
            condition: this.state.condition,
          }}
        />
      );
    }
  }

  buildQuestion = () => (
    <>
      <Col className="" md={7}>
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
      <Col className="align-self-end" md={4}>
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

  buildPickStrategy = () => {
    const conditionalAdvance = () => {
      if (this.state.step === Step.PICK_STRATEGY) {
        this.stepAdvancePersist();
      }
    };

    return (
      <PickStrategy
        bestStrategy={this.state.bestStrategy}
        avatar={this.avatar}
        height={this.state.height}
        dbInject={{
          session: this.unique_id,
          name: this.state.name,
          condition: this.state.condition,
        }}
        giveReward={this.state.condition === Condition.REWARD}
        advance={conditionalAdvance}
        selectStrategy={(strategy: Strategy) => this.setState({ strategy })}
      />
    );
  }

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
              Thanks for participating!
            </p>
          </div>
        </Col>
      </>
    );
  }

  buildMetadata = () => {
    const handleKeyDown = (condition: Condition) => (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter" || e.key === "Spacebar") {
        e.preventDefault(); 
        this.setState({ condition }); 
      }
    }

    return (
      <Col className="h-100 d-flex flex-column">
        <Row className="align-items-center" style={{ flexGrow: 1 }}>
          <Col>
            { 
              this.state.error
              ? <Alert variant="danger">{ this.state.error }</Alert>
              : null
            }
          </Col>
        </Row>
        <Row style={{ flexGrow: 1 }}>
          <Col>
            <div className="input-group input-group-lg">
              <div className="input-group-prepend">
                <span className="input-group-text" id="input-name-text">
                  Enter your name
                </span>
              </div>
              <input 
                type="text"
                className="form-control"
                aria-label="name"
                aria-describedby="input-name-text"
                value={this.state.name} 
                onChange={(e) => this.setState({ name: e.target.value })} 
                placeholder={"Parth Sarin"}
              />
            </div>
          </Col>
        </Row>
        <Row className="align-items-center" style={{ flexGrow: 3 }}>
          <Col className="d-flex align-items-center">
            {
              [Condition.NO_REWARD, Condition.REWARD].map((condition, i) => (
                <div 
                  className={`metadata-condition-box ${this.state.condition === condition ? 'active': ''}`} 
                  key={i}
                  role="button"
                  aria-pressed={this.state.condition === condition}
                  tabIndex={0}
                  onClick={() => this.setState({ condition })}
                  onKeyDown={handleKeyDown(condition)}
                >
                  <span>Condition {i+1}</span>
                </div>
              ))
            }
          </Col>
        </Row>
        <Row className="align-items-center" style={{ flexGrow: 1 }}>
          <Col>
            <Button
              variant="primary"
              onClick={this.stepAdvancePersist}
              className="d-block mx-auto"
              style={{ fontSize: "18pt" }}
            >
              Start
            </Button>
          </Col>
        </Row>
      </Col>
    )
  }

  render() {
    let component: JSX.Element | null = null;
    switch (this.state.step) {
      case Step.STUDY_METADATA:
        component = this.buildMetadata();
        break;
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