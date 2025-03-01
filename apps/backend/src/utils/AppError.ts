import { ICustomError } from "../types/types.interface";

export class AppError extends Error implements ICustomError {
    constructor(public message: string, public status: number = 500) {
        super(message);
        this.name = 'AppError';
    }
}