import Order from "../models/order.js"
import Product from "../models/product.js"

export async function createOrder(req,res){
    if(req.user == null){               //user kenek neweid blno
        res.status(403).json({
            message : "Please login and try again"
        })
        return   // login wechch nethi user kenrkt order dnn denn beri nis mehem dno
    }

    const orderInfo = req.body

    if(orderInfo.name == null){      //orderInfo athule user name ekk dil d blno
        orderInfo.name = req.user.firstName + " " + req.user.lastName  //orderInfo wlt namak dl nethtn reqest ek ewn user ge first name eki last  name eki ekthu krl nmk hdno
    }

    //CBC00001
    let orderId = "CBC00001"
    
    const lastOrder = await Order.find().sort({date : -1}).limit(1)    //date ek piliwelt hdgnn.e kiynne lagdi dpu product ew udinm pennth passe dpuw ytin pennth on nis - dno.+ demmoth wenne eke anith pethth.limit 1 kiyl dl thiyenne udinm penn ewge ekk withrk penn kiyl

    if(lastOrder.length > 0){  //lastOrder ekk dl d blno.last order ekk dl nthtn orderId = "CBC00001" mek wetenne
        const lastOrderId = lastOrder[0].orderId    // last order ek athule thiyen orderId ek gnno
        const lastOrderNumberString = lastOrderId.replace("CBC","")  // CBC00551 mehem orderId ekk cbc kell ain krno
        const lastOrderNumber = parseInt(lastOrderNumberString)   // mekedi wenne mehem thiyen string ek "00551" intiger krl 0 tik ain krno. 551 withri ithuru wenne.parseInt amathrw number dennth plwn
        const newOrderNumber = lastOrderNumber + 1 //newOrderNumber ek kiynne lastOrderNumber number ekt ekk ekthu krm 552
        const newOrderNumberString = String(newOrderNumber).padStart(5, '0');   //newOrderNumber ek ilakkm 5 k bwt convert kr gnno
        orderId = "CBC"+newOrderNumberString//"CBC00552"
    }
        
    try{
        let total = 0;
        let labelledTotal = 0;
        const products = []

        for(let i=0; i<orderInfo.products.length; i++){
                       
            const item = await Product.findOne({productId : orderInfo.products[i].productId})
            if(item == null){  //productid ek werdid blno
                res.status(404).json({
                    message : "Product with productId " + orderInfo.products[i].productId + " not found"
                })
                return //function ek nwththnn
            }
            if(item.isAvailable == false){
                res.status(404).json({
                    message : "Product with productId " + orderInfo.products[i].productId + " is not available right now!"
                })
                return  //function ek nwththnn 
            }
            
            // Make sure qty is a valid number
            const quantity = parseInt(orderInfo.products[i].qty) || 0;
            
            // Make sure price and labelledPrice are valid numbers
            const price = parseFloat(item.price) || 0;
            const labelledPrice = parseFloat(item.labelledPrice) || 0;
            
            products[i] = {
                productInfo : {
                    productId : item.productId,
                    name : item.name,
                    altNames : item.altNames,
                    description : item.description,
                    images : item.images,
                    labelledPrice : labelledPrice,
                    price : price
                },
                quantity: quantity
            }
            
            // Calculate totals using the validated numbers
            total += (price * quantity);
            labelledTotal += (labelledPrice * quantity);
        }

        const order = new Order({
            orderId : orderId,
            email : req.user.email,
            name : orderInfo.name,
            address : orderInfo.address,
            phone : orderInfo.phone,
            products : products,
            labelledTotal : labelledTotal,
            total : total
        })

        const createdOrder =  await order.save()
        res.json({
            message : "Order created successfully",
            order : createdOrder   // createdOrder details denn liyl kynne
        })
    }catch(err){
        res.status(500).json({
            message : "Failed to create order",
            error : err
        })
    
    }
}