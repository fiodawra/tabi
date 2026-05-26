"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFeedback,
  getFeedbackList,
  updateFeedbackStatus,
  type FeedbackStatus,
} from "@/services/feedback-service";
import { useAuth } from "@/stores/auth-store";

const FEEDBACK_QUERY_KEY = ["feedback-list"];

type CreateFeedbackInput = {
  description: string;
  title: string;
};

export function useFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const feedbackListQuery = useQuery({
    queryKey: FEEDBACK_QUERY_KEY,
    queryFn: getFeedbackList,
    enabled: !!user,
  });

  const createFeedbackMutation = useMutation({
    mutationFn: async (input: CreateFeedbackInput) =>
      createFeedback({
        ...input,
        userId: user?.uid as string,
        userName: user?.displayName ?? user?.email ?? "Unknown User",
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: FEEDBACK_QUERY_KEY,
      });
    },
  });

  const updateFeedbackStatusMutation = useMutation({
    mutationFn: async (input: { feedbackId: string; status: FeedbackStatus }) =>
      updateFeedbackStatus(input.feedbackId, input.status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: FEEDBACK_QUERY_KEY,
      });
    },
  });

  return {
    feedbackList: feedbackListQuery.data ?? [],
    isFeedbackListLoading: feedbackListQuery.isLoading,
    createFeedback: createFeedbackMutation.mutateAsync,
    isCreatingFeedback: createFeedbackMutation.isPending,
    updateFeedbackStatus: updateFeedbackStatusMutation.mutateAsync,
    isUpdatingFeedbackStatus: updateFeedbackStatusMutation.isPending,
  };
}
