// ============================================================
// SequenceMode Component - Four Colored Buttons + Messages
// ============================================================

import { SequenceButton } from '../SequenceButton';
import '../SequenceButton.css';
import './SequenceMode.css';

interface SequenceModeProps {
    onButtonPress: (buttonIndex: number, pressed: boolean) => void;
    sequenceState: 'getready' | 'go' | 'memorizing' | 'input' | null;
    isEliminated: boolean;
}

export function SequenceMode({ onButtonPress, sequenceState, isEliminated }: SequenceModeProps) {
    const showMemorization = sequenceState === 'memorizing';
    const showGetReady = sequenceState === 'getready';
    const showGo = sequenceState === 'go';
    const buttonsDisabled = showMemorization || isEliminated || showGetReady || showGo;

    return (
        <div id="mode-sequence">
             {isEliminated && (
                <div className="eliminated-message">
                    <div className="eliminated-text">ELIMINATED</div>
                </div>
            )}
            {!isEliminated && showGetReady && (
                <div className="getready-message">
                    <div className="getready-text">GET READY</div>
                </div>
            )}
            {!isEliminated && showGo && (
                <div className="go-message">
                    <div className="go-text">GO</div>
                </div>
            )}
            {!isEliminated && showMemorization && (
                <div className="memorization-message">
                    <div className="memorization-text">MEMORIZATION TIME</div>
                </div>
            )}
            <div className="sequence-buttons">
                <SequenceButton
                    buttonIndex={0}
                    color="green"
                    label="GREEN"
                    disabled={buttonsDisabled}
                    onPress={(pressed) => onButtonPress(0, pressed)}
                />
                <SequenceButton
                    buttonIndex={1}
                    color="red"
                    label="RED"
                    disabled={buttonsDisabled}
                    onPress={(pressed) => onButtonPress(1, pressed)}
                />
                <SequenceButton
                    buttonIndex={2}
                    color="blue"
                    label="BLUE"
                    disabled={buttonsDisabled}
                    onPress={(pressed) => onButtonPress(2, pressed)}
                />
                <SequenceButton
                    buttonIndex={3}
                    color="yellow"
                    label="YELLOW"
                    disabled={buttonsDisabled}
                    onPress={(pressed) => onButtonPress(3, pressed)}
                />
            </div>
        </div>
    );
}

