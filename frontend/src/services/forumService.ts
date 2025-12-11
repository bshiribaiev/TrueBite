// src/services/forumService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  where,
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

export interface ForumReport {
  id: string;
  postId: string;
  postMessage: string;
  postAuthorId: string;
  postAuthorName: string;
  reporterId: string;
  reporterName: string;
  reason: string;
  status: "PENDING" | "RESOLVED_DELETED" | "RESOLVED_NO_ACTION";
  createdAt: Date;
  resolvedAt?: Date;
  managerNotes?: string;
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

/**
 * Report a forum post for bad behavior
 */
export async function reportPost(
  postId: string,
  postMessage: string,
  postAuthorId: string,
  postAuthorName: string,
  reporterId: string,
  reporterName: string,
  reason: string
): Promise<string> {
  const docRef = await addDoc(collection(db, "forumReports"), {
    postId,
    postMessage,
    postAuthorId,
    postAuthorName,
    reporterId,
    reporterName,
    reason,
    status: "PENDING",
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Delete a forum post (manager only)
 */
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "forum", postId));
}

/**
 * Get all pending forum reports (for manager)
 */
export async function getPendingForumReports(): Promise<ForumReport[]> {
  const q = query(
    collection(db, "forumReports"),
    where("status", "==", "PENDING"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      postId: data.postId,
      postMessage: data.postMessage,
      postAuthorId: data.postAuthorId,
      postAuthorName: data.postAuthorName,
      reporterId: data.reporterId,
      reporterName: data.reporterName,
      reason: data.reason,
      status: data.status,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      resolvedAt: data.resolvedAt?.toDate?.(),
      managerNotes: data.managerNotes,
    } as ForumReport;
  });
}

/**
 * Get all forum reports (for manager)
 */
export async function getAllForumReports(): Promise<ForumReport[]> {
  const q = query(
    collection(db, "forumReports"),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      postId: data.postId,
      postMessage: data.postMessage,
      postAuthorId: data.postAuthorId,
      postAuthorName: data.postAuthorName,
      reporterId: data.reporterId,
      reporterName: data.reporterName,
      reason: data.reason,
      status: data.status,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      resolvedAt: data.resolvedAt?.toDate?.(),
      managerNotes: data.managerNotes,
    } as ForumReport;
  });
}

/**
 * Resolve a forum report (manager only)
 * Can delete the post or dismiss the report
 */
export async function resolveForumReport(
  reportId: string,
  resolution: "RESOLVED_DELETED" | "RESOLVED_NO_ACTION",
  managerNotes: string,
  deleteThePost: boolean,
  postId?: string
): Promise<void> {
  // Update the report status
  const reportRef = doc(db, "forumReports", reportId);
  const { updateDoc } = await import("firebase/firestore");
  
  await updateDoc(reportRef, {
    status: resolution,
    managerNotes,
    resolvedAt: serverTimestamp(),
  });

  // If manager decided to delete the post
  if (deleteThePost && postId) {
    await deletePost(postId);
  }
}