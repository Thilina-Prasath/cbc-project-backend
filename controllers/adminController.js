import Order from "../models/order.js";
import Product from "../models/product.js";
import User from "../models/user.js";


export async function getDashboardStats(req, res)
 {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // 1. Order Status Counts
    const pendingOrders = await Order.countDocuments({ status: 'Pending' });
    const processingOrders = await Order.countDocuments({ status: 'Processing' });
    const shippedOrders = await Order.countDocuments({ status: 'Shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'Delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
    const todayOrdersCount = await Order.countDocuments({ createdAt: { $gte: today } });
    const totalOrdersCount = await Order.countDocuments();

    // 2. Revenue Calculations (MongoDB Aggregation)
    const calculateRevenue = async (startDate, endDate) => {
      const match = endDate 
        ? { createdAt: { $gte: startDate, $lt: endDate }, paymentStatus: 'Paid' }
        : { createdAt: { $gte: startDate }, paymentStatus: 'Paid' };

      const result = await Order.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]);
      return result.length > 0 ? result[0].total : 0;
    };

    const todayRevenue = await calculateRevenue(today);
    const yesterdayRevenue = await calculateRevenue(yesterday, today);
    const weeklyRevenue = await calculateRevenue(startOfWeek);
    const totalRevenueResult = await Order.aggregate([
        { $match: { paymentStatus: 'Paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = totalRevenueResult.length > 0 ? totalRevenueResult[0].total : 0;

    // 3. Inventory Stats
    const totalProducts = await Product.countDocuments();
    const outOfStock = await Product.countDocuments({ stock: 0 });
    const lowStock = await Product.countDocuments({ stock: { $gt: 0, $lte: 10 } }); // 10 ට අඩු

    // 4. User Stats
    const totalUsers = await User.countDocuments();

    // Response එක යැවීම (Frontend එකේ Structure එකට ගැලපෙන සේ)
    res.status(200).json({
      orders: {
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
        todayCount: todayOrdersCount,
        totalCount: totalOrdersCount
      },
      revenue: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        thisWeek: weeklyRevenue,
        total: totalRevenue
      },
      inventory: {
        lowStock: lowStock,
        outOfStock: outOfStock,
        totalProducts: totalProducts
      },
      users: {
        total: totalUsers
      },
      // Payment Status, Chart Data, Best Sellers සඳහාද මේ ආකාරයටම Aggregations ලියා මෙතැනින් යැවිය හැක.
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard data", error: error.message });
  }
};