"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/stores/auth-store";
import {
  getUserProfile,
  updateUserProfile,
  type UserProfile,
} from "@/services/user-service";

function userProfileKey(uid: string | undefined) {
  return ["user-profile", uid];
}

export function useUserProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const uid = user?.uid;

  const profileQuery = useQuery({
    queryKey: userProfileKey(uid),
    enabled: !!uid,
    queryFn: async () => getUserProfile(uid as string),
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (input: Pick<UserProfile, "bio" | "name">) =>
      updateUserProfile(uid as string, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userProfileKey(uid),
      });
    },
  });

  return {
    profile: profileQuery.data,
    isProfileLoading: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
}
