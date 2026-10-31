export const authMiddleware = (req,res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).json({
            status:'No autorizado'
        });
    }
}

