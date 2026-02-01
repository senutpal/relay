import express from 'express';
import { matchRouter } from './routes/matches.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use('/matches', matchRouter);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
























