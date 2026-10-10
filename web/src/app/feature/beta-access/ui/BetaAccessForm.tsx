"use client";

import { useRef, useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import BetaWelcomeDialog from "./BetaWelcomeDialog";
import { BetaAccessError, useBetaAuthentication, useBetaEntry } from "../api/use-beta-access";
import { useIntroPresentation } from "@/app/feature/intro/model/intro-presentation";
import Button from "@/app/shared/ui/atom/button";
import LoadingSpinner from "@/app/shared/ui/atom/loading-spinner";
import TextInput from "@/app/shared/ui/atom/text-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/shared/ui/molecule/card";

const SERVER_ERROR_MESSAGE =
  "인증을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

export type BetaAccessFormViewProps = {
  code: string;
  errorMessage: string | null;
  isSubmitting: boolean;
  isBlocked?: boolean;
  onCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function BetaAccessForm() {
  const [code, setCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const submitting = useRef(false);
  const entering = useRef(false);
  const authentication = useBetaAuthentication();
  const entry = useBetaEntry();
  const { phase } = useIntroPresentation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code || submitting.current || welcomeOpen || phase !== "finished") {
      return;
    }

    submitting.current = true;
    setErrorMessage(null);

    try {
      await authentication.mutateAsync(code);
      setCode("");
      authentication.reset();
      setEntryError(null);
      setNeedsReauthentication(false);
      setWelcomeOpen(true);
    } catch (error) {
      setErrorMessage(error instanceof BetaAccessError ? error.message : SERVER_ERROR_MESSAGE);
    } finally {
      submitting.current = false;
    }
  };

  const handleStart = async () => {
    if (!welcomeOpen || entering.current || needsReauthentication) return;
    entering.current = true;
    setEntryError(null);
    try {
      await entry.mutateAsync();
      setIsNavigating(true);
      // A fresh protected document request avoids stale pre-auth Router Cache.
      window.location.replace("/");
    } catch (error) {
      const unauthorized = error instanceof BetaAccessError && error.status === 401;
      setNeedsReauthentication(unauthorized);
      setEntryError(unauthorized ? "인증이 만료되었어요. 베타 코드를 다시 입력해 주세요." : "입장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      entering.current = false;
    }
  };

  return (
    <>
    <BetaAccessFormView
      code={code}
      errorMessage={errorMessage}
      isSubmitting={authentication.isPending}
      isBlocked={phase !== "finished" || welcomeOpen}
      onCodeChange={(value) => {
        setCode(value);
        if (errorMessage) {
          setErrorMessage(null);
        }
      }}
      onSubmit={handleSubmit}
    />
    {welcomeOpen && <BetaWelcomeDialog
      isEntering={entry.isPending || isNavigating}
      errorMessage={entryError}
      needsReauthentication={needsReauthentication}
      onStart={handleStart}
      onReauthenticate={() => {
        setWelcomeOpen(false);
        setNeedsReauthentication(false);
        setEntryError(null);
        entry.reset();
      }}
    />}
    </>
  );
}

export function BetaAccessFormView({
  code,
  errorMessage,
  isSubmitting,
  isBlocked = false,
  onCodeChange,
  onSubmit,
}: BetaAccessFormViewProps) {
  const errorId = errorMessage ? "beta-access-error" : undefined;

  return (
    <Card className="w-full max-w-[390px] border-white/70 bg-white/90 shadow-[0_24px_70px_rgba(72,52,112,0.16)] backdrop-blur-xl">
      <CardHeader className="items-center px-6 pb-4 pt-7 text-center">
        <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-main/10 text-primary-main">
          <KeyRound aria-hidden="true" className="h-6 w-6" />
        </span>
        <CardTitle className="text-[24px] leading-tight text-ink-page">
          베타 서비스 입장
        </CardTitle>
        <CardDescription className="pt-1 text-[14px] leading-relaxed text-ink-secondary">
          전달받은 접근 코드를 입력해 주세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-7 pt-2">
        <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
          <div>
            <label
              htmlFor="beta-access-code"
              className="mb-2 block text-sm font-semibold text-ink-emphasis"
            >
              베타 접근 코드
            </label>
            <TextInput
              id="beta-access-code"
              name="code"
              type="password"
              value={code}
              placeholder="접근 코드를 입력하세요"
              autoComplete="current-password"
              status={errorMessage ? "error" : "default"}
              aria-invalid={Boolean(errorMessage)}
              aria-describedby={errorId}
              disabled={isSubmitting || isBlocked}
              onValueChange={onCodeChange}
              className="h-12"
            />
            {errorMessage ? (
              <p
                id={errorId}
                role="alert"
                className="mt-2 text-sm font-medium text-error-main"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>

          <Button
            htmlType="submit"
            disabled={!code || isSubmitting || isBlocked}
            className="h-12 w-full gap-2 rounded-2xl"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner
                  label="접근 코드 확인 중"
                  className="h-5 w-5 text-white"
                />
                확인 중
              </>
            ) : (
              "인증하기"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
