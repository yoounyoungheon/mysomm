import type { ChatTurn, PairingSlideView } from "../model/conversation.types";

export interface WinePairingChatViewProps {
  className?: string;
  recommendationVariant?: "A" | "B";
}

export interface WineRecommendationCarouselProps {
  slides: PairingSlideView[];
  className?: string;
}

export interface WineRecommendationSlideProps {
  slide: PairingSlideView;
  className?: string;
}

export interface ChatAnswerBubbleProps {
  turn: ChatTurn;
  className?: string;
}

export interface ChatComposerProps {
  disabled?: boolean;
  placeholder?: string;
  onSend: (message: string) => void;
  className?: string;
}
