// src/services/forumService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

export interface ForumPost {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  message: string;
  createdAt: Date;
}

/**
 * Post a new message to the forum
 */
export async function createForumPost(
  userId: string,
  userName: string,
  userRole: string,
  message: string
): Promise<string> {
  const docRef = await addDoc(collection(db, "forum"), {
    userId,
    userName,
    userRole,
    message,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get all forum posts (one-time fetch)
 */
export async function getForumPosts(): Promise<ForumPost[]> {
  const q = query(collection(db, "forum"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt = data.createdAt?.toDate?.() ?? new Date();

    return {
      id: d.id,
      userId: data.userId,
      userName: data.userName,
      userRole: data.userRole ?? "registered",
      message: data.message,
      createdAt,
    } as ForumPost;
  });
}

/**
 * Subscribe to forum posts in real-time
 * Returns an unsubscribe function
 */
export function subscribeToForumPosts(
  callback: (posts: ForumPost[]) => void
): Unsubscribe {
  const q = query(collection(db, "forum"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const posts = snapshot.docs.map((d) => {
      const data = d.data();
      const createdAt = data.createdAt?.toDate?.() ?? new Date();

      return {
        id: d.id,
        userId: data.userId,
        userName: data.userName,
        userRole: data.userRole ?? "registered",
        message: data.message,
        createdAt,
      } as ForumPost;
    });

    callback(posts);
  });
}