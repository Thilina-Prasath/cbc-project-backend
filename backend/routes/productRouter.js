import express from 'express';
import { deleteProduct,getProductById,getProducts, SaveProducts, searchProducts, updateProduct } from '../contollers/productController.js';

const productRouter = express.Router();

productRouter.get("/",getProducts)

productRouter.post("/",SaveProducts)

productRouter.delete("/:productId",deleteProduct)      // thith deken kinne delete request eke product kiyn eke product kiyn ekn passe e kiynne ala irin psse value ekk awoth e value productId widiyt argen ek run krnn kiyl.e productId ek deleteProduct kiyn function ekn anthimedi run weno.

productRouter.put("/:productId",updateProduct)

productRouter.get("/:productId",getProductById)

productRouter.get("/search/:query",searchProducts)


export default productRouter;