import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginProps } from '../Login';

const formSchema = z.object({
    token: z.string().min(8),
});

const TokenLogin: React.FC<LoginProps> = ({ onSuccess }) => {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            token: "",
        },
    });

    const handleTokenLogin = async (values: z.infer<typeof formSchema>) => {
        // TODO: Test the login
        // const loginResponse = await login(values);
        onSuccess(values.token);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleTokenLogin)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="token"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Token</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter your api token" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <Button type="submit" variant="connection">
                    Login
                </Button>
            </form>
        </Form>
    );
};

export default TokenLogin;
