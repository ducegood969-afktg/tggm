#include "TGGEconomyRules.h"
#include <cassert>
#include <iostream>
#include <random>

int main()
{
    using namespace TGGEconomyRules;
    constexpr auto Max = (std::numeric_limits<std::int32_t>::max)();
    std::int32_t Balance = 777;
    assert(!PurchaseBalance(100, -50, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 0, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 101, false, Balance) && Balance == 777);
    assert(!PurchaseBalance(100, 50, true, Balance) && Balance == 777);
    assert(!PurchaseBalance(-1, 1, false, Balance) && Balance == 777);
    assert(PurchaseBalance(100, 100, false, Balance) && Balance == 0);
    assert(PurchaseBalance(Max, 1, false, Balance) && Balance == Max - 1);
    Balance = 777;
    assert(!CreditBalance(Max, 1, Balance) && Balance == 777);
    assert(!CreditBalance(0, -1, Balance) && Balance == 777);
    assert(!CreditBalance(-1, 1, Balance) && Balance == 777);
    assert(CreditBalance(Max - 100, 100, Balance) && Balance == Max);
    assert(CreditBalance(50, 0, Balance) && Balance == 50);
    // Delivery reward adds to an existing balance rather than resetting it.
    assert(CreditBalance(40, 100, Balance) && Balance == 140);
    assert(ValidMissionState(2, 40)); // Completed mission after a purchase.
    assert(ValidMissionState(0, 0));
    assert(!ValidMissionState(3, 100));
    assert(!ValidMissionState(-1, 0));
    assert(!ValidMissionState(2, -1));

    // Existing $100 save -> music venue purchase -> daily payout -> replay denied.
    std::int32_t Cash = 100;
    std::int32_t Day = 0;
    assert(PurchaseBalance(Cash, 60, false, Cash) && Cash == 40);
    assert(CloseBusinessDay(Cash, 10, Day, -1, Cash, Day));
    assert(Cash == 50 && Day == 1);
    std::int32_t SavedCash = Cash;
    assert(!CollectAvailableDay(Cash, 10, Day, Day, SavedCash));
    assert(SavedCash == Cash);
    assert(CloseBusinessDay(Cash, 10, Day, Day, Cash, Day));
    assert(Cash == 60 && Day == 2);
    std::int32_t NewCash = 777;
    std::int32_t NewDay = 888;
    assert(!CloseBusinessDay(Max, 1, 0, -1, NewCash, NewDay));
    assert(NewCash == 777 && NewDay == 888);
    assert(!CloseBusinessDay(0, 0, Max, Max, NewCash, NewDay));
    assert(!CloseBusinessDay(0, 10, 1, 2, NewCash, NewDay));
    assert(!CloseBusinessDay(0, 10, -1, -1, NewCash, NewDay));
    assert(!CollectAvailableDay(100, 10, 0, -1, NewCash));
    assert(!CollectAvailableDay(100, 10, 2, 3, NewCash));
    assert(NewCash == 777 && NewDay == 888);

    std::mt19937 Random(20261019);
    for (int Index = 0; Index < 100000; ++Index)
    {
        const std::int32_t Cash = static_cast<std::int32_t>(Random() & Max);
        const std::int32_t Cost = static_cast<std::int32_t>(Random() & Max);
        std::int32_t Result = -7;
        const bool Bought = PurchaseBalance(Cash, Cost, false, Result);
        if (Bought)
        {
            assert(Result >= 0 && static_cast<std::int64_t>(Result) + Cost == Cash);
        }
        else { assert(Result == -7); }
        Result = -7;
        const bool Credited = CreditBalance(Cash, Cost, Result);
        const auto Sum = static_cast<std::int64_t>(Cash) + Cost;
        assert(Credited == (Sum <= Max));
        assert(Credited ? Result == Sum : Result == -7);
    }
    std::cout << "Economy boundary cases and 100000 randomized transactions passed.\n";
}
