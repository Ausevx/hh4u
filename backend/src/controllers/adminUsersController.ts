import { Request, Response } from 'express';
import User from '../models/User';
import ChatbotSession from '../models/ChatbotSession';
import QueryClickStats from '../models/QueryClickStats';

/**
 * GET /api/admin/users
 * Paginated list of all users with search/filter by authProvider, email, displayName.
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    let page = parseInt(req.query.page as string, 10);
    let limit = parseInt(req.query.limit as string, 10);
    const authProvider = typeof req.query.authProvider === 'string' ? req.query.authProvider.trim() : undefined;

    if (isNaN(page) || page <= 0) page = 1;
    if (isNaN(limit) || limit <= 0) limit = 20;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (authProvider && ['email_otp', 'google', 'guest'].includes(authProvider)) {
      filter.authProvider = authProvider;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ lastLoginAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate query counts per user
    const userIds = users.map((u) => u._id);
    const queryCounts = await ChatbotSession.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]);

    const queryCountMap = new Map<string, number>();
    for (const entry of queryCounts) {
      queryCountMap.set(entry._id.toString(), entry.count);
    }

    const usersWithCounts = users.map((u) => ({
      id: u._id.toString(),
      email: u.email || null,
      displayName: u.displayName || null,
      authProvider: u.authProvider,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      queryCount: queryCountMap.get(u._id.toString()) || 0,
    }));

    res.status(200).json({
      success: true,
      users: usersWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
};

/**
 * GET /api/admin/users/:id
 * Single user detail including query count and recent sessions.
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).lean();

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const [queryCount, recentSessions] = await Promise.all([
      ChatbotSession.countDocuments({ userId: user._id }),
      ChatbotSession.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('originalQueryText intent matchConfident createdAt')
        .lean(),
    ]);

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email || null,
        displayName: user.displayName || null,
        authProvider: user.authProvider,
        avatarUrl: user.avatarUrl || null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        queryCount,
        recentSessions: recentSessions.map((s) => ({
          id: s._id.toString(),
          queryText: s.originalQueryText,
          intent: s.intent,
          matchConfident: s.matchConfident,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get user by id error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve user' });
  }
};

/**
 * GET /api/admin/analytics/summary
 * Aggregate analytics: total users, total searches, searches per day (30 days),
 * top queried questions, and user breakdown by auth provider.
 */
export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalUsers,
      totalSearches,
      searchesPerDay,
      topQuestions,
      usersByProvider,
    ] = await Promise.all([
      // Total users
      User.countDocuments(),

      // Total searches (all time)
      ChatbotSession.countDocuments(),

      // Searches per day (last 30 days)
      ChatbotSession.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),

      // Top 10 most queried questions
      QueryClickStats.aggregate([
        {
          $group: {
            _id: '$level1QuestionId',
            totalClicks: { $sum: '$clickCount' },
          },
        },
        { $sort: { totalClicks: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'level1questions',
            localField: '_id',
            foreignField: '_id',
            as: 'question',
          },
        },
        { $unwind: { path: '$question', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            questionText: { $ifNull: ['$question.canonicalQuestionText', 'Unknown'] },
            count: '$totalClicks',
            _id: 0,
          },
        },
      ]),

      // Users breakdown by auth provider
      User.aggregate([
        {
          $group: {
            _id: '$authProvider',
            count: { $sum: 1 },
          },
        },
        { $project: { provider: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        totalUsers,
        totalSearches,
        searchesPerDay,
        topQuestions,
        usersByProvider,
      },
    });
  } catch (error: any) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve analytics summary' });
  }
};
