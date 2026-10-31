import { checkServerHealth } from '../services/authServices.js';


export const  getHealth = (req, res) => {
    try {
        const healtData = checkServerHealth();

        return res.status(200).json(healtData)
    }catch (error) {
        return req.status(500).json({
            status: 'Error del servidor'
        });
    }
}