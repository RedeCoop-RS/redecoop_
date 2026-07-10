import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class CustomResponseInterceptor implements NestInterceptor {
    private readonly logger = new Logger(CustomResponseInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        return next.handle().pipe(
            map(data => ({
                statusCode,
                message: statusCode >= 400 ? response.message : undefined,
                data,
            })),
            catchError(err => {

                let errors: any;

                if (typeof err.response === 'object' && err.response.hasOwnProperty('errors')) {
                    errors = err.response.errors;
                    err.message = 'Validação de dados falhou';
                }

                const statusCode = err instanceof HttpException ? err.getStatus() : 500;
                const errorResponse = {
                    statusCode,
                    message: err.message || 'Internal server error',
                    error: err.name || 'Error',
                    errors,
                    timestamp: new Date().toISOString(),
                    path: request.url,
                };

                if(statusCode === 500){
                    this.logger.error('error request', errorResponse);
                }
                
                return throwError(() => new HttpException(errorResponse, statusCode));
            })
        );
    }
}